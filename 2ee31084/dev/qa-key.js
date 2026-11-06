(() => {
  const ev = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true, cancelable: true });
  document.dispatchEvent(ev);
  const prevented = ev.defaultPrevented;
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
  return JSON.stringify({ prevented, walking: document.body.classList.contains('walking'), active: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : null, hidden: document.hidden });
})()
