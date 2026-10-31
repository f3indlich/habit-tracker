(function () {
  var d = document.createElement('div');
  d.className = 'legacy';
  d.setAttribute('role', 'alert');
  d.textContent = 'Ваш браузер устарел. Обновите его, чтобы пользоваться трекером.';
  document.body.insertBefore(d, document.body.firstChild);
})();
