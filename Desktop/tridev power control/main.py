import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tridev_database.db")

# Database Setup
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Inquiry(Base):
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    email = Column(String, nullable=True)
    product = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String, default="General")
    description = Column(String, nullable=True)
    image_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    image_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Config(Base):
    __tablename__ = "configs"
    key = Column(String, primary_key=True)
    value = Column(String)

class AdminUser(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

Base.metadata.create_all(bind=engine)

# Auth Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


# App Initialization
app = FastAPI(title="Tridev Power Control API")

# Security: CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: Basic security headers
from fastapi import Request
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Serve static files
app.mount("/admin", StaticFiles(directory="admin"), name="admin")
app.mount("/images", StaticFiles(directory="images"), name="images")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Ensure uploads directory exists
if not os.path.exists("uploads"):
    os.makedirs("uploads")
# Serve the main site files
@app.get("/")
async def read_index():
    return FileResponse("index.html")

@app.get("/style.css")
async def read_css():
    return FileResponse("style.css")

@app.get("/script.js")
async def read_js():
    return FileResponse("script.js")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemes
class InquiryCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    product: Optional[str] = None
    message: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# Endpoints
@app.post("/api/contact")
async def create_inquiry(
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(None),
    product: str = Form(None),
    message: str = Form(None),
    db: Session = Depends(get_db)
):
    new_inquiry = Inquiry(
        name=name,
        phone=phone,
        email=email,
        product=product,
        message=message
    )
    db.add(new_inquiry)
    db.commit()
    db.refresh(new_inquiry)
    
    # Send Email Notification (Background)
    send_email_notification(name, phone, product, message, db)
    
    return {"status": "success", "message": "Inquiry submitted successfully"}

def send_email_notification(name, phone, product, message, db: Session):
    # Fetch settings from DB
    settings = {c.key: c.value for c in db.query(Config).all()}
    
    smtp_server = settings.get("SMTP_SERVER") or os.getenv("SMTP_SERVER")
    smtp_port = settings.get("SMTP_PORT") or os.getenv("SMTP_PORT", 587)
    smtp_user = settings.get("SMTP_USER") or os.getenv("SMTP_USER")
    smtp_pass = settings.get("SMTP_PASS") or os.getenv("SMTP_PASS")
    receiver = settings.get("NOTIFY_EMAIL") or os.getenv("NOTIFY_EMAIL")

    if not all([smtp_server, smtp_user, smtp_pass, receiver]):
        return # Not configured

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = receiver
        msg['Subject'] = f"New Inquiry from {name} - Tridev Power"
        
        body = f"New Inquiry Details:\n\nName: {name}\nPhone: {phone}\nProduct: {product}\nMessage: {message}"
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Email error: {e}")

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/admin/inquiries")
async def get_inquiries(current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    inquiries = db.query(Inquiry).order_by(Inquiry.created_at.desc()).all()
    return inquiries

@app.delete("/api/admin/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: int, current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    db.delete(inquiry)
    db.commit()
    return {"status": "success", "message": "Inquiry deleted"}

@app.get("/api/admin/stats")
async def get_stats(current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(Inquiry).count()
    today = db.query(Inquiry).filter(Inquiry.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)).count()
    return {
        "total_inquiries": total,
        "today_inquiries": today
    }

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@app.post("/api/admin/change-password")
async def change_password(data: PasswordChange, current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if not pwd_context.verify(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = pwd_context.hash(data.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}

@app.get("/api/admin/email-settings")
async def get_email_settings(current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    configs = db.query(Config).all()
    return {c.key: c.value for c in configs}

@app.post("/api/admin/email-settings")
async def update_email_settings(data: dict, current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in data.items():
        config = db.query(Config).filter(Config.key == key).first()
        if config:
            config.value = str(value)
        else:
            db.add(Config(key=key, value=str(value)))
    db.commit()
    return {"status": "success", "message": "Email settings updated successfully"}

# Product Endpoints
@app.get("/api/products")
async def get_public_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.created_at.desc()).all()

@app.post("/api/admin/products")
async def create_product(
    name: str = Form(...),
    category: str = Form("General"),
    description: str = Form(None),
    image: UploadFile = File(...),
    current_user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security: Validate file extension
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    file_extension = os.path.splitext(image.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed. Please upload an image.")

    file_name = f"{datetime.now().timestamp()}{file_extension}"
    file_path = os.path.join("images", file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await image.read())
    
    new_product = Product(
        name=name,
        category=category,
        description=description,
        image_path=f"/images/{file_name}"
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.delete("/api/admin/products/{product_id}")
async def delete_product(product_id: int, current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Optional: Delete file from disk
    try:
        os.remove(product.image_path.lstrip("/"))
    except:
        pass
        
    db.delete(product)
    db.commit()
    return {"status": "success", "message": "Product deleted"}

@app.post("/api/admin/seed-products")
async def manual_seed(current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete existing to ensure fresh start
    db.query(Product).delete()
    
    default_products = [
        {"name": "PLC Automation Panel", "category": "Automation", "description": "Advanced programmable logic for industrial automation.", "image_path": "/images/plc-panel.png"},
        {"name": "MCC Control Panel", "category": "Control Panels", "description": "Motor Control Centers for centralized operation.", "image_path": "/images/mcc-control-panel.png"},
        {"name": "APFC Panel", "category": "Control Panels", "description": "Automatic Power Factor Correction for energy saving.", "image_path": "/images/apfc-panel.png"},
        {"name": "DG Synchronization", "category": "Control Panels", "description": "Load sharing panels for multiple generators.", "image_path": "/images/dg-sync-panel.png"},
        {"name": "L.T. Panel", "category": "Power Distribution", "description": "Low Tension power distribution main boards.", "image_path": "/images/lt-panel.png"},
        {"name": "Distribution Panel", "category": "Power Distribution", "description": "Sub-circuit distribution with safety breakers.", "image_path": "/images/distribution-panel.png"},
        {"name": "Oven Control Panel", "category": "Automation", "description": "PID based temperature control for industrial furnaces.", "image_path": "/images/oven-control-panel.png"},
        {"name": "1-Phase & 3-Phase", "category": "Power Distribution", "description": "Standard electrical panels for various voltage requirements.", "image_path": "/images/single-three-phase-panels.png"},
        {"name": "Custom Control Panels", "category": "Control Panels", "description": "Tailor-made control logic for specific machinery.", "image_path": "/images/control-panels.png"}
    ]
    for p in default_products:
        new_p = Product(name=p["name"], category=p["category"], description=p["description"], image_path=p["image_path"])
        db.add(new_p)
    db.commit()
    return {"status": "success", "message": "All 9 original products have been restored."}

# Project Endpoints
@app.get("/api/projects")
async def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@app.post("/api/admin/projects")
async def create_project(
    title: str = Form(...),
    image: UploadFile = File(...),
    current_user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security: Validate file extension
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    file_extension = os.path.splitext(image.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed. Please upload an image.")

    file_name = f"project_{datetime.now().timestamp()}{file_extension}"
    file_path = os.path.join("images", file_name)
    with open(file_path, "wb") as buffer:
        buffer.write(await image.read())
    
    new_project = Project(title=title, image_path=f"/images/{file_name}")
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@app.delete("/api/admin/projects/{project_id}")
async def delete_project(project_id: int, current_user: AdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project: raise HTTPException(status_code=404)
    db.delete(project)
    db.commit()
    return {"status": "success"}

# Initial Admin & Product Creation (Run once)
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    # Create Admin
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    
    admin = db.query(AdminUser).filter(AdminUser.username == admin_user).first()
    if not admin:
        hashed_pw = pwd_context.hash(admin_pass)
        new_admin = AdminUser(username=admin_user, hashed_password=hashed_pw)
        db.add(new_admin)
        db.commit()
    
    # Seed Products if empty
    product_count = db.query(Product).count()
    if product_count == 0:
        default_products = [
            {"name": "PLC Automation Panel", "description": "Advanced programmable logic for industrial automation.", "image_path": "/images/plc-panel.png"},
            {"name": "MCC Control Panel", "description": "Motor Control Centers for centralized operation.", "image_path": "/images/mcc-control-panel.png"},
            {"name": "APFC Panel", "description": "Automatic Power Factor Correction for energy saving.", "image_path": "/images/apfc-panel.png"},
            {"name": "DG Synchronization", "description": "Load sharing panels for multiple generators.", "image_path": "/images/dg-sync-panel.png"},
            {"name": "L.T. Panel", "description": "Low Tension power distribution main boards.", "image_path": "/images/lt-panel.png"},
            {"name": "Distribution Panel", "description": "Sub-circuit distribution with safety breakers.", "image_path": "/images/distribution-panel.png"},
            {"name": "Oven Control Panel", "description": "PID based temperature control for industrial furnaces.", "image_path": "/images/oven-control-panel.png"},
            {"name": "1-Phase & 3-Phase", "description": "Standard electrical panels for various voltage requirements.", "image_path": "/images/single-three-phase-panels.png"},
            {"name": "Custom Control Panels", "description": "Tailor-made control logic for specific machinery.", "image_path": "/images/control-panels.png"}
        ]
        for p in default_products:
            new_p = Product(name=p["name"], description=p["description"], image_path=p["image_path"])
            db.add(new_p)
        db.commit()
    db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
