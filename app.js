document.addEventListener('DOMContentLoaded', () => {
    // Current application state
    const state = {
        currentStep: 1,
        isVerified: false,
        language: 'en',
        formData: {
            secNumber: '',
            tinNumber: '',
            companyType: '',
            email: '',
            mobile: '',
            companyName: 'ABC Manufacturing Corporation',
            regDate: 'March 15, 2018',
            regAddress: '12/F Net One Center, 26th Street, BGC, Taguig City, Metro Manila, Philippines',
            industry: 'Manufacturing - Electronic Components',
            authorizedCapital: 'PHP 10,000,000',
            paidUpCapital: 'PHP 2,500,000',
            annualTurnover: 'PHP 15,000,000',
            directors: [
                { id: 1, name: 'Maria Santos', role: 'Managing Director', status: 'Verified', avatar: 'MS' },
                { id: 2, name: 'John Doe', role: 'Chairman / Director', status: 'Pending', avatar: 'JD' }
            ],
            files: [
                { name: 'SEC_Certificate_of_Incorporation.pdf', size: '2.1 MB' },
                { name: 'Articles_of_Incorporation.pdf', size: '4.7 MB' }
            ]
        }
    };

    // DOM Cache
    const screens = document.querySelectorAll('.screen-container');
    const stepItems = document.querySelectorAll('.step-item');
    const progressBar = document.querySelector('.progress-bar-fill');
    const progressPct = document.querySelector('.progress-pct');
    const stepLabel = document.querySelector('.progress-header span');
    
    // Bottom Buttons
    const btnBack = document.getElementById('btn-back');
    const btnContinue = document.getElementById('btn-continue');
    const btnSave = document.getElementById('btn-save');
    
    // Form Inputs Screen 1
    const secInput = document.getElementById('sec-number');
    const tinInput = document.getElementById('tin-number');
    const companyTypeSelect = document.getElementById('company-type');
    const emailInput = document.getElementById('business-email');
    const mobileInput = document.getElementById('mobile-number');
    const btnFetch = document.getElementById('btn-fetch');
    const verifyOverlay = document.getElementById('verify-overlay');
    const verificationResult = document.getElementById('verification-result');
    const populatedDetails = document.getElementById('populated-details');
    
    // Language buttons
    const langBtnEn = document.getElementById('lang-en');
    const langBtnFil = document.getElementById('lang-fil');

    // Translation Dictionary
    const translations = {
        en: {
            headline: "Open Your Corporate Current Account",
            subtitle: "Open a business account digitally in just a few minutes.",
            cardTitle: "Business Verification",
            cardSubtitle: "Enter registered corporate details to fetch information from the SEC Registry.",
            secLabel: "SEC Registration Number",
            tinLabel: "Tax Identification Number (TIN)",
            typeLabel: "Company Type",
            emailLabel: "Business Email Address",
            mobileLabel: "Mobile Number",
            btnFetchText: "Fetch Business Info",
            btnSaveText: "Save & Continue Later",
            verifying: "Verifying company details...",
            verifyingSub: "Connecting to SEC Registry...",
            foundText: "✓ Company Found",
            companyNameVal: "ABC Manufacturing Corporation"
        },
        fil: {
            headline: "Buksan ang Iyong Corporate Current Account",
            subtitle: "Magbukas ng account sa negosyo sa digital na paraan sa loob lamang ng ilang minuto.",
            cardTitle: "Pagpapatunay ng Negosyo",
            cardSubtitle: "Ipasok ang rehistradong detalye upang kunin ang impormasyon sa SEC Registry.",
            secLabel: "Numero ng Rehistrasyon sa SEC",
            tinLabel: "Numero ng Pagkakakilanlan sa Buwis (TIN)",
            typeLabel: "Uri ng Kumpanya",
            emailLabel: "Email Address ng Negosyo",
            mobileLabel: "Numero ng Mobile",
            btnFetchText: "Kunin ang Impormasyon",
            btnSaveText: "I-save at Ituloy Mamaya",
            verifying: "Sinusuri ang mga detalye...",
            verifyingSub: "Kumokonekta sa SEC Registry...",
            foundText: "✓ Nahanap ang Kumpanya",
            companyNameVal: "Korporasyon ng ABC Manufacturing"
        }
    };

    // Helper: Mask TIN Input (Format: XXX-XXX-XXX-XXX)
    if (tinInput) {
        tinInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let formatted = '';
            if (value.length > 0) {
                formatted += value.substring(0, 3);
            }
            if (value.length > 3) {
                formatted += '-' + value.substring(3, 6);
            }
            if (value.length > 6) {
                formatted += '-' + value.substring(6, 9);
            }
            if (value.length > 9) {
                formatted += '-' + value.substring(9, 12);
            }
            e.target.value = formatted;
            validateScreen1();
        });
    }

    // Helper: Format SEC Input (Allow letters and numbers, max 15 chars)
    if (secInput) {
        secInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            validateScreen1();
        });
    }

    if (emailInput) emailInput.addEventListener('input', validateScreen1);
    if (mobileInput) mobileInput.addEventListener('input', validateScreen1);
    if (companyTypeSelect) companyTypeSelect.addEventListener('change', validateScreen1);

    // Validate Screen 1 inputs to enable "Fetch Business" button
    function validateScreen1() {
        if (state.isVerified) return; // Keep continue active if verified
        
        const secVal = secInput.value.trim();
        const tinVal = tinInput.value.replace(/-/g, '').trim();
        const typeVal = companyTypeSelect.value;
        const emailVal = emailInput.value.trim();
        const mobileVal = mobileInput.value.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailRegex.test(emailVal);
        const isPhoneValid = mobileVal.length >= 9; // Min phone length without +63
        const isSecValid = secVal.length >= 5;
        const isTinValid = tinVal.length >= 9;

        if (isSecValid && isTinValid && typeVal !== "" && isEmailValid && isPhoneValid) {
            btnFetch.disabled = false;
        } else {
            btnFetch.disabled = true;
        }
    }

    // ==========================================
    // OTP VERIFICATION FLOW
    // ==========================================
    let otpInterval = null;
    const otpOverlay = document.getElementById('otp-overlay');
    const otpDigits = document.querySelectorAll('.otp-digit');
    const btnOtpVerify = document.getElementById('btn-otp-verify');
    const btnOtpCancel = document.getElementById('btn-otp-cancel');
    const otpEmailDisplay = document.getElementById('otp-email-display');
    const otpMobileDisplay = document.getElementById('otp-mobile-display');

    function startOtpCountdown() {
        const countdownEl = document.getElementById('otp-countdown');
        if (!countdownEl) return;
        
        let timeLeft = 59;
        countdownEl.textContent = timeLeft;
        
        if (otpInterval) clearInterval(otpInterval);
        
        otpInterval = setInterval(() => {
            timeLeft--;
            const countEl = document.getElementById('otp-countdown');
            if (countEl) {
                countEl.textContent = timeLeft;
            }
            if (timeLeft <= 0) {
                clearInterval(otpInterval);
                const timerContainer = document.querySelector('.otp-timer');
                if (timerContainer) {
                    timerContainer.innerHTML = '<a href="#" id="resend-otp-link" style="color: var(--primary-orange); font-weight: 700; text-decoration: none;">Resend Code</a>';
                    
                    document.getElementById('resend-otp-link')?.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (timerContainer) {
                            timerContainer.innerHTML = 'Resend OTP in <span id="otp-countdown">59</span>s';
                        }
                        startOtpCountdown();
                        
                        // Show a temporary success toast
                        const toast = document.createElement('div');
                        toast.style.cssText = 'position: fixed; bottom: 40px; right: 40px; background-color: var(--primary-purple-dark); color: white; padding: 12px 24px; border-radius: 8px; box-shadow: var(--shadow-medium); z-index: 1000; font-size: 13px; font-weight: 600;';
                        toast.textContent = 'OTP Resent Successfully!';
                        document.body.appendChild(toast);
                        setTimeout(() => { toast.remove(); }, 3000);
                    });
                }
            }
        }, 1000);
    }

    if (otpDigits.length > 0) {
        otpDigits.forEach((digit, index) => {
            // Move focus to next box on key input
            digit.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, ''); // Digits only
                if (e.target.value.length === 1) {
                    if (index < otpDigits.length - 1) {
                        otpDigits[index + 1].focus();
                    }
                }
                checkOtpCompletion();
            });

            // Move focus to previous box on Backspace key
            digit.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (digit.value.length === 0 && index > 0) {
                        otpDigits[index - 1].focus();
                        otpDigits[index - 1].value = '';
                    } else {
                        digit.value = '';
                    }
                    checkOtpCompletion();
                }
            });
        });
    }

    function checkOtpCompletion() {
        let code = '';
        otpDigits.forEach(digit => code += digit.value);
        if (code.length === 6) {
            btnOtpVerify.disabled = false;
        } else {
            btnOtpVerify.disabled = true;
        }
    }

    // SIMULATED FETCH BUSINESS PROCESS -> Request OTP
    if (btnFetch) {
        btnFetch.addEventListener('click', () => {
            // Show Verify Overlay as loading indicator
            const overlayText = document.querySelector('.verify-text');
            const overlaySubtext = document.querySelector('.verify-subtext');
            
            if (overlayText) overlayText.textContent = 'Requesting Verification Code...';
            if (overlaySubtext) overlaySubtext.textContent = 'Sending secure OTP...';
            
            verifyOverlay.style.display = 'flex';
            
            setTimeout(() => {
                verifyOverlay.style.display = 'none';
                
                // Update email and mobile references in the OTP screen
                if (otpEmailDisplay) otpEmailDisplay.textContent = emailInput.value.trim() || 'finance@company.com';
                if (otpMobileDisplay) otpMobileDisplay.textContent = mobileInput.value ? `+63 ${mobileInput.value}` : '+63 917 123 4567';
                
                // Show the OTP overlay inside the card
                if (otpOverlay) {
                    otpOverlay.style.display = 'flex';
                }
                
                // Clear and focus the OTP boxes
                otpDigits.forEach(digit => digit.value = '');
                btnOtpVerify.disabled = true;
                if (otpDigits[0]) otpDigits[0].focus();
                
                // Reset timer countdown
                const timerContainer = document.querySelector('.otp-timer');
                if (timerContainer) {
                    timerContainer.innerHTML = 'Resend OTP in <span id="otp-countdown">59</span>s';
                }
                startOtpCountdown();
            }, 1200);
        });
    }

    // Cancel OTP action
    if (btnOtpCancel) {
        btnOtpCancel.addEventListener('click', () => {
            if (otpOverlay) otpOverlay.style.display = 'none';
            if (otpInterval) clearInterval(otpInterval);
        });
    }

    // Verify OTP action -> Show SEC Data
    if (btnOtpVerify) {
        btnOtpVerify.addEventListener('click', () => {
            const overlayText = document.querySelector('.verify-text');
            const overlaySubtext = document.querySelector('.verify-subtext');
            
            if (overlayText) overlayText.textContent = 'Verifying OTP...';
            if (overlaySubtext) overlaySubtext.textContent = 'Confirming identity...';
            
            verifyOverlay.style.display = 'flex';
            
            setTimeout(() => {
                // Clear timer
                if (otpInterval) clearInterval(otpInterval);
                
                // Hide loaders and OTP screens
                verifyOverlay.style.display = 'none';
                if (otpOverlay) otpOverlay.style.display = 'none';
                
                // Show Result Panel and pre-populated cards
                verificationResult.style.display = 'block';
                populatedDetails.style.display = 'block';
                
                // Set state as verified
                state.isVerified = true;
                
                // Update fetch button
                btnFetch.innerHTML = '✓ Company Verified';
                btnFetch.style.backgroundColor = '#10b981';
                btnFetch.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                btnFetch.disabled = true;
                
                // Enable Next button
                btnContinue.disabled = false;
                
                // Update stepper step 1 state
                const firstStep = stepItems[0];
                firstStep.classList.add('completed');
                firstStep.querySelector('.step-badge').innerHTML = '✓';
                stepItems[1].classList.add('active');
                
                // Trigger auto-scroll
                populatedDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 1500);
        });
    }

    // LANGUAGE SWITCHER
    if (langBtnEn && langBtnFil) {
        langBtnEn.addEventListener('click', () => toggleLanguage('en'));
        langBtnFil.addEventListener('click', () => toggleLanguage('fil'));
    }

    function toggleLanguage(lang) {
        state.language = lang;
        if (lang === 'en') {
            langBtnEn.classList.add('active');
            langBtnFil.classList.remove('active');
        } else {
            langBtnFil.classList.add('active');
            langBtnEn.classList.remove('active');
        }

        const keys = translations[lang];
        
        // Update texts in Welcome screen
        const headline = document.querySelector('.hero-column h1');
        const subtitle = document.querySelector('.hero-column p.subtitle');
        const cardTitle = document.querySelector('.card-title');
        const cardSubtitle = document.querySelector('.card-subtitle');
        
        const labelSec = document.querySelector('label[for="sec-number"]');
        const labelTin = document.querySelector('label[for="tin-number"]');
        const labelType = document.querySelector('label[for="company-type"]');
        const labelEmail = document.querySelector('label[for="business-email"]');
        const labelMobile = document.querySelector('label[for="mobile-number"]');
        
        const overlayText = document.querySelector('.verify-text');
        const overlaySubtext = document.querySelector('.verify-subtext');
        const resultHeader = document.querySelector('.result-header');

        if (headline) headline.textContent = keys.headline;
        if (subtitle) subtitle.textContent = keys.subtitle;
        if (cardTitle) cardTitle.textContent = keys.cardTitle;
        if (cardSubtitle) cardSubtitle.textContent = keys.cardSubtitle;
        
        if (labelSec) labelSec.childNodes[0].textContent = keys.secLabel + ' ';
        if (labelTin) labelTin.childNodes[0].textContent = keys.tinLabel + ' ';
        if (labelType) labelType.childNodes[0].textContent = keys.typeLabel + ' ';
        if (labelEmail) labelEmail.childNodes[0].textContent = keys.emailLabel + ' ';
        if (labelMobile) labelMobile.childNodes[0].textContent = keys.mobileLabel + ' ';
        
        if (overlayText) overlayText.textContent = keys.verifying;
        if (overlaySubtext) overlaySubtext.textContent = keys.verifyingSub;
        if (resultHeader) resultHeader.textContent = keys.foundText;
        
        // Update Fetch button if not yet verified
        if (!state.isVerified && btnFetch) {
            btnFetch.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.547 9.34 4.5 10.561 4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> ${keys.btnFetchText}`;
        }
    }

    // MULTI-STEP NAVIGATION WIZARD
    function navigateToStep(step) {
        // Range checks
        if (step < 1 || step > 6) return;
        
        // Trigger page transition effects
        const activeScreen = document.querySelector('.screen-container.active');
        if (activeScreen) {
            activeScreen.classList.remove('active');
            setTimeout(() => {
                activeScreen.style.display = 'none';
                showTargetScreen(step);
            }, 300);
        } else {
            showTargetScreen(step);
        }
    }

    function showTargetScreen(step) {
        state.currentStep = step;
        const targetScreen = document.getElementById(`screen-${step}`);
        if (targetScreen) {
            targetScreen.style.display = 'block';
            setTimeout(() => {
                targetScreen.classList.add('active');
            }, 50);
        }
        
        updateNavigationButtons();
        updateStepperSidebar();
        
        // Auto-scroll main window back to top on transitions
        document.querySelector('.main-layout').scrollTop = 0;
    }

    function updateNavigationButtons() {
        // Adjust footer buttons based on step
        if (state.currentStep === 1) {
            btnBack.disabled = true;
            btnContinue.disabled = !state.isVerified; // Enabled only if fetch was successful
            btnContinue.innerHTML = 'Continue <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>';
            btnSave.style.display = 'inline-flex';
            document.querySelector('.bottom-nav').style.display = 'flex';
        } else if (state.currentStep >= 2 && state.currentStep <= 5) {
            btnBack.disabled = false;
            btnSave.style.display = 'inline-flex';
            document.querySelector('.bottom-nav').style.display = 'flex';
            
            if (state.currentStep === 5) {
                // Screen 5 is review, verify checkboxes before enabling submit
                const declarationChecked = document.getElementById('declaration-check')?.checked;
                btnContinue.disabled = !declarationChecked;
                btnContinue.innerHTML = 'Submit Application <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
            } else {
                btnContinue.disabled = false;
                btnContinue.innerHTML = 'Continue <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>';
            }
        } else if (state.currentStep === 6) {
            // Success step - hide bottom nav bar entirely
            document.querySelector('.bottom-nav').style.display = 'none';
        }
    }

    function updateStepperSidebar() {
        // Map 1-5 to stepper list items
        stepItems.forEach((item, index) => {
            const stepNum = index + 1;
            item.classList.remove('active', 'completed');
            
            if (stepNum === state.currentStep) {
                item.classList.add('active');
                // If it was already completed (e.g. going back), we let badge remain as number/icon
                if (stepNum > 1 || (stepNum === 1 && state.isVerified)) {
                    item.querySelector('.step-badge').innerHTML = stepNum;
                }
            } else if (stepNum < state.currentStep) {
                item.classList.add('completed');
                item.classList.add('active'); // Allow clicking back to completed steps
                item.querySelector('.step-badge').innerHTML = '✓';
            } else {
                // Future steps: active only if preceding step is completed
                if (stepNum === 2 && state.isVerified) {
                    item.classList.add('active');
                } else if (stepNum <= state.currentStep) {
                    item.classList.add('active');
                }
            }
        });

        // Update progress bar
        let percent = 20;
        if (state.currentStep === 2) percent = 40;
        if (state.currentStep === 3) percent = 60;
        if (state.currentStep === 4) percent = 80;
        if (state.currentStep === 5) percent = 95;
        if (state.currentStep === 6) percent = 100;
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPct) progressPct.textContent = `${percent}%`;
        if (stepLabel) {
            if (state.currentStep <= 5) {
                stepLabel.textContent = `Step ${state.currentStep} of 5`;
            } else {
                stepLabel.textContent = `Onboarding Completed`;
            }
        }
    }

    // Sidebar Step click handlers
    stepItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const targetStep = index + 1;
            
            // Allow navigating only to active (accessible) steps
            if (item.classList.contains('active')) {
                navigateToStep(targetStep);
            }
        });
    });

    // Navigation button handlers
    if (btnContinue) {
        btnContinue.addEventListener('click', () => {
            if (state.currentStep < 6) {
                navigateToStep(state.currentStep + 1);
            }
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            if (state.currentStep > 1) {
                navigateToStep(state.currentStep - 1);
            }
        });
    }

    // SAVE & CONTINUE LATER TRIGGER
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const email = emailInput.value.trim() || 'your registered email';
            
            // Show alert box (using premium modal feel in production, using structured confirm here)
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 40px;
                background-color: var(--primary-purple-dark);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: var(--shadow-medium);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 1000;
                transform: translateY(20px);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid rgba(255,255,255,0.1);
            `;
            
            notification.innerHTML = `
                <div style="background-color: var(--primary-orange); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <div>
                    <h4 style="font-size: 13.5px; font-weight: 700; margin: 0;">Draft Application Saved!</h4>
                    <p style="font-size: 11.5px; opacity: 0.8; margin: 2px 0 0 0;">Resume link sent to <strong>${email}</strong>.</p>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Trigger animate in
            setTimeout(() => {
                notification.style.transform = 'translateY(0)';
                notification.style.opacity = '1';
            }, 50);

            // Animate out after 4 seconds
            setTimeout(() => {
                notification.style.transform = 'translateY(20px)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.remove();
                }, 400);
            }, 4000);
        });
    }

    // ==========================================
    // SCREEN 3: DIRECTORS KYC SIMULATED UPDATE
    // ==========================================
    window.verifyDirector = function(directorId) {
        const verifyBtn = document.getElementById(`btn-verify-dir-${directorId}`);
        const badge = document.getElementById(`status-dir-${directorId}`);
        if (!verifyBtn || !badge) return;

        const dirIndex = state.formData.directors.findIndex(d => d.id === directorId);
        if (dirIndex === -1) return;

        const currentStatus = state.formData.directors[dirIndex].status;

        if (currentStatus === 'Pending') {
            // First Click: Transition to Pending Verification and HOLD
            state.formData.directors[dirIndex].status = 'PendingVerification';
            
            badge.className = 'status-badge verifying';
            badge.textContent = 'Pending Verification';
            
            verifyBtn.textContent = 'Approve KYC Verification';
            verifyBtn.style.backgroundColor = '#5a2e91'; // Deep purple to indicate approval action
            verifyBtn.style.boxShadow = '0 4px 12px rgba(90, 46, 145, 0.2)';
            
            // Re-render review screen to reflect current status
            updateReviewScreen();
        } else if (currentStatus === 'PendingVerification') {
            // Second Click: Transition to Verified & Completed
            state.formData.directors[dirIndex].status = 'Verified';
            
            badge.className = 'status-badge verified';
            badge.textContent = 'Verified';
            
            // Replace action button with completed checkmark badge
            verifyBtn.outerHTML = `
                <div style="background-color: var(--success-green-bg); border: 1px solid var(--success-green-border); border-radius: 20px; padding: 6px 12px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--success-green);">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Completed
                </div>
            `;
            
            // Re-render review screen
            updateReviewScreen();
        }
    };

    // Add Director Custom Modal Controls
    const dirModal = document.getElementById('director-modal');
    const addDirBtn = document.getElementById('add-director-btn');
    const closeDirModalBtn = document.getElementById('btn-close-director-modal');
    const cancelDirModalBtn = document.getElementById('btn-cancel-director-modal');
    const submitDirModalBtn = document.getElementById('btn-submit-director-modal');
    
    // Modal input cache
    const modalDirName = document.getElementById('modal-dir-name');
    const modalDirRole = document.getElementById('modal-dir-role');
    const modalDirEmail = document.getElementById('modal-dir-email');
    const modalDirMobile = document.getElementById('modal-dir-mobile');

    if (addDirBtn && dirModal) {
        // Open Modal
        addDirBtn.addEventListener('click', () => {
            dirModal.style.display = 'flex';
            // Clear inputs
            modalDirName.value = '';
            modalDirRole.selectedIndex = 0;
            modalDirEmail.value = '';
            modalDirMobile.value = '';
            
            // Reset borders
            modalDirName.style.borderColor = '';
            modalDirRole.style.borderColor = '';
            modalDirEmail.style.borderColor = '';
            modalDirMobile.style.borderColor = '';
        });
    }

    const hideDirectorModal = () => {
        if (dirModal) dirModal.style.display = 'none';
    };

    if (closeDirModalBtn) closeDirModalBtn.addEventListener('click', hideDirectorModal);
    if (cancelDirModalBtn) cancelDirModalBtn.addEventListener('click', hideDirectorModal);

    // Format modal phone input
    if (modalDirMobile) {
        modalDirMobile.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    if (submitDirModalBtn) {
        submitDirModalBtn.addEventListener('click', () => {
            const nameVal = modalDirName.value.trim();
            const roleVal = modalDirRole.value;
            const emailVal = modalDirEmail.value.trim();
            const mobileVal = modalDirMobile.value.trim();

            let isValid = true;

            // Simple validation highlighting
            const validateField = (el, condition) => {
                if (condition) {
                    el.style.borderColor = '';
                } else {
                    el.style.borderColor = 'var(--error-red)';
                    isValid = false;
                }
            };

            validateField(modalDirName, nameVal !== '');
            validateField(modalDirRole, roleVal !== '' && roleVal !== null);
            validateField(modalDirEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal));
            validateField(modalDirMobile, mobileVal.length >= 9);

            if (!isValid) return;

            // Generate id and initials
            const newId = state.formData.directors.length + 1;
            const initials = nameVal.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Create new director state
            const newDirector = {
                id: newId,
                name: nameVal,
                role: roleVal,
                email: emailVal,
                mobile: `+63 ${mobileVal}`,
                status: 'Pending',
                avatar: initials
            };

            state.formData.directors.push(newDirector);

            // Append to Board list DOM
            const container = document.getElementById('directors-list-container');
            const card = document.createElement('div');
            card.className = 'stakeholder-card';
            card.id = `director-card-${newId}`;
            card.innerHTML = `
                <div class="stakeholder-info">
                    <div class="stakeholder-avatar">${initials}</div>
                    <div class="stakeholder-details">
                        <h4>${nameVal}</h4>
                        <p>${roleVal}</p>
                        <p style="font-size: 11.5px; color: var(--text-light); margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="display:inline-flex; align-items:center; gap:3px;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:11px; height:11px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> ${emailVal}</span>
                            <span style="color: var(--border-color)">|</span>
                            <span style="display:inline-flex; align-items:center; gap:3px;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:11px; height:11px;"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 15h9" /></svg> +63 ${mobileVal}</span>
                        </p>
                    </div>
                </div>
                <div class="stakeholder-status">
                    <span id="status-dir-${newId}" class="status-badge pending">Pending KYC</span>
                    <button id="btn-verify-dir-${newId}" class="btn btn-primary" onclick="verifyDirector(${newId})" style="padding: 6px 14px; font-size: 12px; margin: 0; min-width: auto;">
                        Start KYC Verification
                    </button>
                </div>
            `;

            container.appendChild(card);
            
            // Hide modal and update review
            hideDirectorModal();
            updateReviewScreen();
        });
    }

    // ==========================================
    // SCREEN 4: DOCUMENT UPLOAD SIMULATED PROCESS
    // ==========================================
    const uploadZones = [
        { id: 'sec-gis-upload', name: 'SEC_General_Information_Sheet_2026.pdf', size: '3.4 MB' },
        { id: 'aoi-upload', name: 'Articles_of_Incorporation_Signed.pdf', size: '4.2 MB' },
        { id: 'board-res-upload', name: 'Board_Resolution_Account_Opening.pdf', size: '1.8 MB' },
        { id: 'bir-cert-upload', name: 'BIR_Form_2303_Registration.pdf', size: '1.2 MB' },
        { id: 'financials-upload', name: 'Audited_Financial_Statements_2025.pdf', size: '5.6 MB' },
        { id: 'itr-upload', name: 'Income_Tax_Return_Form_1702_Signed.pdf', size: '3.1 MB' }
    ];

    let currentUploadZone = null;
    const fileInput = document.getElementById('system-file-input');
    const uploadModal = document.getElementById('upload-progress-modal');
    const modalFilename = document.getElementById('upload-filename');
    const modalFilesize = document.getElementById('upload-filesize');
    const progressFill = document.getElementById('modal-upload-progress-fill');
    const progressPctText = document.getElementById('modal-upload-pct');

    uploadZones.forEach(zone => {
        const el = document.getElementById(zone.id);
        if (el) {
            el.addEventListener('click', () => {
                currentUploadZone = zone;
                if (fileInput) fileInput.click(); // Trigger native file system picker
            });
        }
    });

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !currentUploadZone) return;

            const name = file.name;
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

            // Show progress modal
            if (uploadModal) uploadModal.style.display = 'flex';
            if (modalFilename) modalFilename.textContent = name;
            if (modalFilesize) modalFilesize.textContent = sizeMB;
            if (progressFill) progressFill.style.width = '0%';
            if (progressPctText) progressPctText.textContent = '0%';

            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressPctText) progressPctText.textContent = `${progress}%`;

                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        // Hide modal
                        if (uploadModal) uploadModal.style.display = 'none';
                        
                        // Add file to list
                        state.formData.files.push({ name: name, size: sizeMB });
                        renderFileList();
                        updateReviewScreen();
                        
                        // Clear input value so same file can be uploaded again
                        fileInput.value = '';
                    }, 400);
                }
            }, 75);
        });
    }

    function renderFileList() {
        const container = document.getElementById('uploaded-files-container');
        if (!container) return;
        
        container.innerHTML = '';
        state.formData.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'uploaded-file-item';
            item.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    </span>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${file.size}</span>
                </div>
                <button class="btn-icon-only" onclick="removeFile(${index})" title="Remove file">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
            `;
            container.appendChild(item);
        });
    }

    window.removeFile = function(index) {
        state.formData.files.splice(index, 1);
        renderFileList();
        updateReviewScreen();
    };

    // ==========================================
    // SCREEN 5: REVIEW SCREEN DATA POPULATOR
    // ==========================================
    function updateReviewScreen() {
        // Form details
        const mapVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || 'Not Specified';
        };

        // Screen 1 & 2 details
        mapVal('rev-company-name', state.formData.companyName);
        mapVal('rev-sec-num', secInput.value || 'CN201889471');
        mapVal('rev-tin', tinInput.value || '009-847-192-000');
        mapVal('rev-company-type', companyTypeSelect.options[companyTypeSelect.selectedIndex]?.text || 'Stock Corporation');
        mapVal('rev-email', emailInput.value || 'finance@abcmfg.com');
        mapVal('rev-mobile', mobileInput.value ? `+63 ${mobileInput.value}` : '+63 917 123 4567');
        
        mapVal('rev-auth-capital', document.getElementById('auth-capital')?.value || state.formData.authorizedCapital);
        mapVal('rev-paid-capital', document.getElementById('paid-capital')?.value || state.formData.paidUpCapital);
        mapVal('rev-turnover', document.getElementById('annual-turnover')?.value || state.formData.annualTurnover);
        mapVal('rev-industry', document.getElementById('company-industry')?.value || state.formData.industry);

        // Directors list
        const dirsRevContainer = document.getElementById('rev-directors-list');
        if (dirsRevContainer) {
            dirsRevContainer.innerHTML = '';
            state.formData.directors.forEach(dir => {
                const badgeClass = dir.status === 'Verified' ? 'status-badge verified' : 'status-badge pending';
                const item = document.createElement('div');
                item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);';
                item.innerHTML = `
                    <div>
                        <div style="font-weight: 600; font-size: 13.5px; color: var(--text-dark);">${dir.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-light);">${dir.role}</div>
                    </div>
                    <span class="${badgeClass}" style="font-size: 10px; padding: 2px 8px;">${dir.status}</span>
                `;
                dirsRevContainer.appendChild(item);
            });
        }

        // Uploaded files list
        const filesRevContainer = document.getElementById('rev-files-list');
        if (filesRevContainer) {
            filesRevContainer.innerHTML = '';
            if (state.formData.files.length === 0) {
                filesRevContainer.innerHTML = '<div style="font-size: 13px; color: var(--text-light); font-style: italic;">No files uploaded.</div>';
            } else {
                state.formData.files.forEach(file => {
                    const item = document.createElement('div');
                    item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; color: var(--text-dark);';
                    item.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="var(--primary-orange)" stroke-width="2" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <span style="font-weight: 500;">${file.name}</span>
                    `;
                    filesRevContainer.appendChild(item);
                });
            }
        }
    }

    // Bind Edit buttons on Review Screen
    window.goToStep = function(stepNum) {
        navigateToStep(stepNum);
    };

    // Watch declaration checkbox
    const decCheckbox = document.getElementById('declaration-check');
    if (decCheckbox) {
        decCheckbox.addEventListener('change', () => {
            updateNavigationButtons();
        });
    }

    // Initializations
    renderFileList();
    updateReviewScreen();
    validateScreen1();

    // Hook listeners for Screen 2 inputs to update review page dynamically
    document.getElementById('auth-capital')?.addEventListener('input', updateReviewScreen);
    document.getElementById('paid-capital')?.addEventListener('input', updateReviewScreen);
    document.getElementById('annual-turnover')?.addEventListener('change', updateReviewScreen);
    document.getElementById('company-industry')?.addEventListener('change', updateReviewScreen);
});
