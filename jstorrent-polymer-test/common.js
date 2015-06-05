window.reload = chrome.runtime.reload
//document.querySelector('core-splitter').size=269


document.addEventListener('polymer-ready', function() {
    console.log('polymer-ready');
});

document.addEventListener('WebComponentsReady', function() {
    console.log('WebComponentsReady');
});
