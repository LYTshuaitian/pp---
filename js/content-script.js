if (location.href.indexOf('www.baidu.com/?tn=59046333_dg') !== -1) {
    if (document.getElementById('s_mancard_main')) {
        chrome.runtime.sendMessage({what: '_trackEvent', category: 'NewTab', action: 'show_bd_pindao', label: '1'});
    } else {
        var ifr0Urltop = chrome.extension.getURL('single.html');
        var iframe0top = $('<iframe src="'+ifr0Urltop+'" frameborder="no" border="0" marginwidth="0" marginheight="0" scrolling="no" allowtransparency="yes" style="overflow: visible; padding: 0px; right: auto; z-index: '+(2147483647)+'; margin-top:5px; left: 0px;  position: block; height:130px; width: 100%; display: inline; background: transparent;"></iframe>');
        if(document.getElementById('s_fm')) {
            $('#s_fm').append(iframe0top);
        } else {
            $('#form').append(iframe0top);
        }
        
        
        var ifHideMV = function(){
            if(document.getElementById('s_fm')) {
                if(parseInt($('#s_fm').css('margin-left')) < 50) {
                    iframe0top.remove();    
                }
            } else {
                if(parseInt($('#form').css('margin-left')) < 50) {
                    iframe0top.remove();    
                }
            }
                        
        };
        $("#kw").on('input',ifHideMV);
        $("#kw").on('focus',ifHideMV);
        $("#kw").on('blur',ifHideMV);
        
        $('#form').submit(function() {
            if ($('#kw').val().trim()) {
                iframe0top.remove();
            }
        });        
        
        chrome.runtime.sendMessage({what: '_trackEvent', category: 'NewTab', action: 'show_bd_pindao', label: '0'});
    }
}

var ifrUrltop = chrome.extension.getURL('nav.html');
var iframetop = $('<iframe src="'+ifrUrltop+'" class="eb_tips" style="border: 0px; overflow: visible; padding: 0px; right: auto; z-index: '+(2147483647)+'; top: 0px; left: 0px; box-shadow: rgba(0, 0, 0, 0.498039) 0px 3px 10px; position: fixed; height:200px; width: 100%; display: inline; background: transparent;"></iframe>');
	
// 从存储中读取数据
	chrome.storage.local.get('closedTips-top', function(result) {
		 if (result['closedTips-top']) {

		 } else {
			 $('body').append(iframetop);
			 $('html').css('margin-top','200px');
		 }
	});

	
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		if (request.what == "closeTips-top") {
			iframetop.remove();
			$('html').css('margin-top','0px');
			chrome.storage.local.set({'closedTips-top': true}, function() {
				//console.log('保存成功');
			});
		}
	});


