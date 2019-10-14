$('#most-visited a').click(function() {
    var domain = this.href.replace(/(http|https):\/\//ig,'').replace(/www\.|\//ig,'');
    chrome.runtime.sendMessage({what: '_trackEvent', category: 'NewTab', action: 'clickMV', label: domain});    
});