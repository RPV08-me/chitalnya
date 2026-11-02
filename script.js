const API_URL = 'http://localhost:3000/api';

function getCurrentUser() {
    const user = localStorage.getItem('chitalnya_user');
    return user ? JSON.parse(user) : null;
}

function saveCurrentUser(user) {
    localStorage.setItem('chitalnya_user', JSON.stringify(user));
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const toggleBtn = document.querySelector('.password_toggle');
if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
        const passInput = this.previousElementSibling;
        if (passInput.type === 'password') {
            passInput.type = 'text';
            this.style.color = '#4a3a2c';
        } else {
            passInput.type = 'password';
            this.style.color = '#7a6b5d';
        }
    });
}

const regForm = document.querySelector('.register_form form');
if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            surname: document.getElementById('surname').value,
            name: document.getElementById('name').value,
            patronymic: document.getElementById('patronymic').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        };
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                alert(`Регистрация успешна! Ваш билет: № ${result.ticket_number}`);
                window.location.href = 'auto.html';
            } else {
                alert('Ошибка: ' + result.error);
            }
        } catch (err) {
            alert('Не удалось связаться с сервером. Проверьте, запущен ли Node.js.');
        }
    });
}

const loginForm = document.querySelector('.login_form_container form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        };
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                saveCurrentUser(result.user);
                alert(`Добро пожаловать, ${result.user.name}!`);
                window.location.href = 'account.html';
            } else {
                alert('Ошибка: ' + result.error);
            }
        } catch (err) {
            alert('Не удалось связаться с сервером.');
        }
    });
}

const profileForm = document.querySelector('.profile_form');
if (profileForm) {
    const user = getCurrentUser();
    
    if (!user) {
        alert('Пожалуйста, авторизуйтесь.');
        window.location.href = 'auto.html';
    } else {
        document.querySelector('.ticket_number').textContent = `Читательский билет № ${user.ticket_number}`;
        document.querySelector('.profile_header h1').textContent = `Здравствуйте, ${user.name}`;
        document.getElementById('surname').value = user.surname;
        document.getElementById('name').value = user.name;
        document.getElementById('patronymic').value = user.patronymic || '';
        document.getElementById('phone').value = user.phone;
        document.getElementById('email').value = user.email;

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedData = {
                surname: document.getElementById('surname').value,
                name: document.getElementById('name').value,
                patronymic: document.getElementById('patronymic').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
            };
            try {
                const response = await fetch(`${API_URL}/users/${user.id}/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                const result = await response.json();
                if (result.success) {
                    saveCurrentUser({ ...user, ...updatedData });
                    alert('Данные сохранены!');
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } catch (err) {
                alert('Ошибка соединения с сервером.');
            }
        });

        async function loadUserBooks() {
            try {
                const response = await fetch(`${API_URL}/users/${user.id}/loans`);
                const loans = await response.json();

                const readingList = document.getElementById('reading_list');
                const readingEmpty = document.getElementById('reading_empty');

                readingList.innerHTML = '';

                let readingCount = 0;

                loans.forEach(loan => {
                    let statusText = 'На руках';
                    let statusClass = 'success';
                    
                    if (loan.status === 'overdue') { statusText = 'Просрочена'; statusClass = 'danger'; }
                    if (loan.status === 'returned') { statusText = 'Возвращена'; statusClass = 'success'; }

                    const cardHTML = `
                        <div class="book_list_item">
                            <div class="book_list_cover" style="background-image: url('${loan.cover_url || 'default_cover.webp'}');"></div>
                            <div class="book_list_info">
                                <div class="book_list_title">${loan.title}</div>
                                <div class="book_list_author">${loan.author}</div>
                                <div class="book_list_dates">${statusText}</div>
                            </div>
                            <div class="status_badge ${statusClass}">${statusText}</div>
                        </div>
                    `;

                    readingList.innerHTML += cardHTML;
                    readingCount++;
                });

                readingEmpty.classList.toggle('hidden', readingCount > 0);
                readingList.classList.toggle('hidden', readingCount === 0);

            } catch (err) {
                console.error('Ошибка загрузки книг:', err);
            }
        }

        loadUserBooks();
    }
}

const catalogContainer = document.querySelector('.catalog_header');
if (catalogContainer) {
    const modal = document.getElementById('bookingModal');
    const modalClose = document.querySelector('.modal_close');
    const modalCancel = document.querySelector('.btn_cancel');
    let currentBookId = null;

    document.querySelectorAll('.open-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentBookId = this.dataset.bookId;
            modal.classList.add('active');
        });
    });

    if (modalClose) modalClose.addEventListener('click', () => modal.classList.remove('active'));
    if (modalCancel) modalCancel.addEventListener('click', () => modal.classList.remove('active'));

    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    const bookingForm = document.querySelector('.booking_form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) {
                alert('Пожалуйста, авторизуйтесь, чтобы забронировать книгу.');
                window.location.href = 'auto.html';
                return;
            }
            if (!currentBookId) {
                alert('Ошибка: не выбрана книга.');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/books/${currentBookId}/reserve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Книга успешно забронирована!');
                    modal.classList.remove('active');
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } catch (err) {
                alert('Ошибка соединения с сервером.');
            }
        });
    }
}