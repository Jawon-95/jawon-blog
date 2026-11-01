const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function paymentReturnPage(state) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const encoded = JSON.stringify(state).replaceAll('<', '\\u003c');
  const title = state.paid ? 'Payment confirmed' : state.canceled ? 'Payment canceled' : state.status === 'expired' ? 'Checkout expired' : 'Confirming your payment';
  const detail = state.paid ? 'Your payment was received. Your product will show the purchase details.'
    : state.canceled ? 'You can return to the product whenever you are ready.'
      : state.status === 'expired' ? 'Return to the product to start a new checkout.'
        : 'We are checking the result with Stripe. Please do not pay again while confirmation is pending.';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · JawonStudio</title><meta name="robots" content="noindex,nofollow">
<style nonce="${nonce}">
:root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;min-height:100svh;display:grid;place-items:center;background:light-dark(#f6f7f9,#111517);color:light-dark(#1c252b,#e7edf0)}main{max-width:440px;padding:40px 24px;text-align:center}h1{font-size:28px;line-height:1.2;margin:16px 0}p{line-height:1.6}a{display:inline-block;margin:16px 0;padding:12px 24px;border-radius:8px;background:light-dark(#183c36,#b4dfce);color:light-dark(#fff,#11261f);text-decoration:none;font-weight:600}.muted{color:light-dark(#54616a,#a5b3bb);font-size:14px}#mark{font-size:36px}button{font:inherit;padding:8px 12px}a:focus-visible,button:focus-visible{outline:3px solid currentColor;outline-offset:4px}
</style></head><body><main><div id="mark" aria-hidden="true">${state.paid ? '✓' : state.canceled ? '↩' : '…'}</div>
<div aria-live="polite"><h1 id="title">${title}</h1><p id="detail">${detail}</p><p class="muted" id="countdown">${state.paid ? 'Returning to your product in 3 seconds…' : ''}</p></div>
<a id="return" href="${escape(state.destination)}">Return to product now</a>
<p class="muted">You may close this page. Confirmed purchases continue to be processed in the background.</p>
<noscript><p>Use the button above to return to your product.</p></noscript>
<script nonce="${nonce}">
const initial=${encoded};
const title=document.getElementById('title'),detail=document.getElementById('detail'),countdown=document.getElementById('countdown');
let redirectStarted=false;
function confirmed(state){
 if(redirectStarted)return;redirectStarted=true;
 document.getElementById('mark').textContent='✓';title.textContent='Payment confirmed';
 detail.textContent='Your payment was received. Your product will show the purchase details.';
 let seconds=3;countdown.textContent='Returning to your product in '+seconds+' seconds…';
 const timer=setInterval(()=>{seconds--;if(seconds<=0){clearInterval(timer);window.location.replace(state.destination);}else countdown.textContent='Returning to your product in '+seconds+' seconds…';},1000);
}
async function check(){
 const url=new URL(window.location.href);url.searchParams.set('format','json');
 for(let attempt=0;attempt<40;attempt++){
  await new Promise(resolve=>setTimeout(resolve,3000));
  try{const response=await fetch(url,{cache:'no-store',credentials:'omit'});if(!response.ok)continue;const state=await response.json();
   if(state.paid){confirmed(state);return;}if(state.status==='expired'){title.textContent='Checkout expired';detail.textContent='Return to the product to start a new checkout.';return;}
  }catch{}
 }
 detail.textContent='Confirmation is taking longer than usual. Return to the product to check your order. Please do not pay again yet.';
}
if(initial.paid)confirmed(initial);else if(!initial.canceled&&initial.status!=='expired')check();
</script></main></body></html>`;
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
  } });
}
