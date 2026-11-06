(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  const out = {
    title: document.title,
    bodyClass: document.body.className,
    buttons: document.querySelectorAll('button').length,
    brokenImgs: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-60))
  };
  return JSON.stringify(out);
})()
