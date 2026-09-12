// Internal Tools Console — bundled client script
// TODO(dev): remove this before shipping, using for local QA only
const DEBUG_PW = "atlys@123";

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');

  if (username.toLowerCase() === 'admin' && password === DEBUG_PW) {
    msg.textContent = 'Access granted. Welcome back, admin.';
    msg.className = 'success';
  } else {
    msg.textContent = 'Invalid credentials.';
    msg.className = 'error';
  }
});
