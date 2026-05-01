// Main JS for TRIDEV POWER CONTROL Website
// 1. SMOOTH SCROLL
window.addEventListener('DOMContentLoaded', function() {
    if (window.Lenis) {
        const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smooth: true });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
    }
    // 2. GSAP Animations
    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.to(".hero h1", { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.2 });
        gsap.to(".hero-sub", { opacity: 1, duration: 1, delay: 0.6 });
        // Removed grid and card image animation for instant image display
    }
    // 3. Custom Cursor (Disabled to restore default mouse)
    /*
    const cursor = document.querySelector('.cursor');
    if (cursor) {
        document.addEventListener('mousemove', e => {
            if (window.gsap) {
                gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: "power2.out" });
            } else {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            }
        });
        document.querySelectorAll('.hover-target, a, button').forEach(item => {
            item.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
            item.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
        });
    }
    */
    // 4. Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = this.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Sending...';
            fetch("/api/contact", { 
                method: "POST", 
                body: new FormData(this)
            }).then(r => {
                if(r.ok) { 
                    btn.innerText = 'Sent Successfully!'; 
                    btn.style.background = '#2563eb'; 
                    btn.style.color='white'; 
                    this.reset(); 
                }
                else { 
                    btn.innerText = 'Error!'; 
                    btn.style.background = 'red'; 
                }
            }).catch(() => btn.innerText = 'Error!').finally(() => setTimeout(() => { 
                btn.innerText = originalText; 
                btn.style.background = '#000'; 
                btn.style.color='white'; 
            }, 3000));
        });
    }
    // 5. Mobile Nav Toggle
    (function(){
        const mobileToggle = document.getElementById('mobileToggle');
        const mobileNav = document.getElementById('mobileNav');
        if(mobileToggle && mobileNav) {
            mobileToggle.addEventListener('click', () => {
                const isOpen = mobileNav.classList.toggle('open');
                mobileToggle.classList.toggle('open', isOpen);
                mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                mobileNav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
            });
            mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
                mobileNav.classList.remove('open');
                mobileToggle.classList.remove('open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileNav.setAttribute('aria-hidden', 'true');
            }));
            document.addEventListener('keydown', (e) => {
                if(e.key === 'Escape') {
                    mobileNav.classList.remove('open');
                    mobileToggle.classList.remove('open');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileNav.setAttribute('aria-hidden', 'true');
                }
            });
        }
    })();

    // 6. Custom Dropdown Logic
    (function(){
        const customSelect = document.getElementById('productSelect');
        if (!customSelect) return;
        const trigger = customSelect.querySelector('.select-trigger');
        const options = customSelect.querySelector('.select-options');
        const input = document.getElementById('productInput');
        const triggerText = trigger.querySelector('span');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelect.classList.toggle('open');
        });

        document.addEventListener('click', () => customSelect.classList.remove('open'));

        options.addEventListener('click', (e) => {
            if (e.target.classList.contains('option')) {
                const val = e.target.getAttribute('data-value');
                triggerText.innerText = val;
                input.value = val;
                triggerText.style.color = 'var(--text-main)';
                customSelect.classList.remove('open');
            }
        });
    })();

    // 0. Security Helpers (XSS Protection)
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 7. Dynamic Content Loader
    async function loadContent() {
        const productGrid = document.getElementById('dynamicProducts');
        const projectGrid = document.getElementById('projectGridPublic');
        const optionsContainer = document.querySelector('.select-options');
        const waBtn = document.getElementById('waBtn');

        // Load Products
        try {
            const pRes = await fetch('/api/products');
            const products = await pRes.json();
            if (products && products.length > 0) {
                if (productGrid) productGrid.innerHTML = '';
                if (optionsContainer) optionsContainer.innerHTML = '';

                // Group products by category
                const grouped = products.reduce((acc, p) => {
                    if (!acc[p.category]) acc[p.category] = [];
                    acc[p.category].push(p);
                    return acc;
                }, {});

                for (const cat in grouped) {
                    // Add Category Title
                    const catTitle = document.createElement('h3');
                    catTitle.className = 'category-title';
                    catTitle.innerText = cat;
                    if (productGrid) productGrid.appendChild(catTitle);

                    const catGrid = document.createElement('div');
                    catGrid.className = 'grid-container';
                    catGrid.style.marginBottom = '4rem';

                    grouped[cat].forEach(p => {
                        const card = document.createElement('div');
                        card.className = 'card hover-target';
                        card.innerHTML = `
                            <img src="${p.image_path}" class="card-img" alt="${escapeHTML(p.name)}">
                            <div class="card-content">
                                <h3>${escapeHTML(p.name)}</h3>
                                <p>${escapeHTML(p.description || '')}</p>
                                <a href="https://wa.me/919958037801?text=Hi, I am interested in ${encodeURIComponent(p.name)}" target="_blank" class="magnetic-btn" style="padding: 0.5rem 1rem; font-size: 0.7rem; margin-top: 1rem;">Inquiry on WhatsApp</a>
                            </div>
                        `;
                        catGrid.appendChild(card);
                        
                        if (optionsContainer) {
                            const opt = document.createElement('div');
                            opt.className = 'option hover-target';
                            opt.setAttribute('data-value', p.name);
                            opt.innerText = p.name;
                            optionsContainer.appendChild(opt);
                        }
                    });
                    if (productGrid) productGrid.appendChild(catGrid);
                }
            }
        } catch (e) { console.log("Product load failed"); }

        // Load Projects
        try {
            const projRes = await fetch('/api/projects');
            const projects = await projRes.json();
            if (projects && projects.length > 0 && projectGrid) {
                projectGrid.innerHTML = '';
                projects.forEach(proj => {
                    const card = document.createElement('div');
                    card.className = 'card hover-target';
                    card.innerHTML = `
                        <img src="${proj.image_path}" class="card-img" alt="${escapeHTML(proj.title)}">
                        <div class="card-content">
                            <h3>${escapeHTML(proj.title)}</h3>
                            <a href="https://wa.me/919958037801?text=Hi, I am interested in knowing more about this project: ${encodeURIComponent(proj.title)}" target="_blank" class="magnetic-btn" style="padding: 0.5rem 1rem; font-size: 0.7rem; margin-top: 1rem;">Enquiry about Project</a>
                        </div>
                    `;
                    projectGrid.appendChild(card);
                });
            }
        } catch (e) { console.log("Gallery load failed"); }
    }

    loadContent();
});
