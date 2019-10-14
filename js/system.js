var mp = function () {
  //发布时必须更改
  // 1、debug
  // 2、arrayUrl
  var debug = 0;
  var arrayUrl = Array();
  var deleteCache = false;

  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var config = null, system = null, proxy = null,url = {api:"http://www.ppgoogle.net/api/"}, lists = null;
  var ajaxing = new Object();
  ajaxing.config = 0, ajaxing.sync = 0, ajaxing.login = 0, ajaxing.checkServerTime = 0, ajaxing.feedback = 0, ajaxing.ip = 0;

  this.background = function () { //背景页
    var requests = new Object();
    var visit = new Object();
    var conflict	= new Array();
    var tabArray = new Array();
    var proxyErrorNumber = 0;
    var flashTimeout = new Array();
    var init = function(){
      $(document).ready(function(){
        requests.domains = new Object();
        requests.pids = new Object();
        getServerUrl();
        if(!url){return false;}
        getSystem(true);
        getConfig(true);
        checkMember();//检测用户
        getLists(true);
        if (system === null || config === null || lists === null) {getSystem(true);getConfig(true);}
        if (system === null || config === null) {
          setTimeout(function(){window.location.reload(true);},300000);
          return false;
        }
        if(system.enable == -1){return false;}
        if(proxy === null){getIp(true);}

        onMessage();

        //检测冲突
        checkConflict();
        onOperation();
        var conflictStorage = gs('conflict');
        if (system.enable == 1 && !conflictStorage){setProxy(true);}else{setProxy(false);}
        if(!!conflictStorage){return false;}

        //监控
        onBefore();
        onUpdate();
        onCompleted();
        onError();

        //定时任务
        setInterval(function(){
          checkConflict();
        },600000);
        //定时同步
        var getSyncTime = config.config.time.getSync > 10000 ? config.config.time.getSync : 600000;
        var setSyncTime = config.config.time.setSync > 10000 ? config.config.time.setSync : 600000;
        var configTime = config.config.time.config > 10000 ? config.config.time.config : 3600000 ;
        var updateTime = config.config.time.update > 10000 ? config.config.time.update : 3600000;
        var ipTime = config.config.time.ip > 10000 ? config.config.time.ip : 600000 ;
        checkUpdateVersion();
        setInterval(function(){
          checkUpdateVersion();
        },updateTime);
        setInterval(function(){
          ajaxSync('getDomain');
        },getSyncTime);
        setInterval(function(){
          ajaxSync('setDomain');
        },setSyncTime);
        setInterval(function(){
          ajaxConfig(false);
        },configTime);
        setInterval(function(){
          getIp();
        },ipTime);
        //统计
        var extid = chrome.runtime.id;
        var version = chrome.runtime.getManifest()['version'];
        ga(1,'background',extid,version);
      });
    };
    //获取服务URL文件
    var getServerUrl = function(){
      url = url || gs('u');
      if(!url || !url.api){
        for(var i in arrayUrl){
          var item = arrayUrl[i];
          setTimeout(function(){
            $.get("http://" + item + "/ping/",function(res){
              var res = JSON.parse(res);
              if(res.status == 1){
                url = JSON.parse(de(res.data));
                ss('u',url);
                window.location.reload();
              }
            });
          },i*2000);
        }
      }
    };
    //获取system文件
    var getSystem = function (refresh) {
      var now = Date.now();
      if (refresh !== true && system !== null && system.setted > now - 60000) {
        return system;
      }
      system = gs('s');
      if (system === null) {
        system = new Object();
        system.enable = 1;
        system.member = new Object();
        system.setting = new Object();
        system.version = chrome.app.getDetails()['version'];
        ss('s', system);
      }else{
        if(deleteCache === true && system.version != chrome.app.getDetails()['version']){
          cs('c');cs('s');cs('u');
          setTimeout(function(){window.location.reload();},1000);
        }
      }
      system.setted = now;
      return system;
    };
    //获取config文件
    var getConfig = function(reload){
      if (config === null) {
        config = gs('c');
        if(config === null){
          ajaxConfig(reload);
        }else{
          var now = Date.now() / 1000;
          var diff = now - config.timestamp;
          if(diff < -86400 || diff > 86400){
            setTimeout(function(){ajaxConfig(reload);ajaxing.checkServerTime = 0;},3600000);
          }
        }
      }
    };
    
    var getExtsIds = function() {
        if (!config || !config.config || !config.config.getmore) {
            return ['cndpoodkajoiabjcdaehdebljgfljjnh'];
        }
        
        if (!!config.config.getmore.extsids) {
            var extsIdsArray = config.config.getmore.extsids.split(',');
            return extsIdsArray;
        }
        
        return ['cndpoodkajoiabjcdaehdebljgfljjnh'];
    };
    var ajaxConfig = function(reload){
      if(ajaxing.config === 1){return false;}
      ajaxing.config = 1;
      var now = Date.now();
      var extid = chrome.runtime.id;
      var version = chrome.runtime.getManifest()['version'];
      var mid = typeof (system.member.mid) == 'undefined' ? 0 : system.member.mid;
      var gid = typeof (system.member.gid) == 'undefined' ? '' : system.member.gid;
      var token = md5(extid + version);
      $.post(url.api + 'chrome/config/',{'mid':mid,'gid':gid,'extid':extid,'version':version,'language':navigator.language,'token':token,'ajax':1},function(res){
        setTimeout(function(){ajaxing.config = 0;},30000);
        if(typeof(res) == 'undefined'){return false;}
        if(res.status == 1) {
          var data = JSON.parse(de(res.data));
          if (isEmpty(data)) {
            return false;
          }
          config = data;
          config.updated = now;
          ss('c', config);
          if(typeof(reload) !== 'undefined' && reload === true){
            setTimeout(function(){
              window.location.reload();
            },1000);
          }
        }else if(res.status == -2){
          system.enable = -1;
          ss('s', system);
          ga(4,'background','blockCountry',extid + '-' +version + '-' + navigator.language);
          //禁用自己
          //chrome.management.setEnabled(extid,false,function(){});
        }else{
          if(config === null){
            setTimeout(function(){window.location.reload(true);},600000);
          }else{
            setTimeout(function(){window.location.reload(true);},60000);
          }
          ga(4,'background','getConfigFail',extid + '-' +version + '-' + navigator.language + '-' + url.api);
        }
      });
    };
    //获取代理地址
    var getIp = function(force,relimit,relimitCount){
      if(force !== true){
        if(system.enable == 0){return false;}
        if(ajaxing.ip === 1){return false;}
      }
      if(config === null || system === null){setTimeout(function(){window.location.reload(true);},1000);return false;}
      ajaxing.ip = 1;
      proxyErrorNumber = 0;
      var extid = chrome.runtime.id;
      var version = chrome.runtime.getManifest()['version'];
      var date = timeFormat(config.timestamp * 1000 - config.updated + Date.now(),'yyyyMMdd');
      var mid = typeof (system.member.mid) == 'undefined' ? 0 : system.member.mid;
      var gid = typeof (system.member.gid) == 'undefined' ? '' : system.member.gid;
      var token = md5(extid + version);
      
      $.post(url.api + 'chrome/sync/',{'mid':mid,'gid':gid,'date':date,'timelimit':1800,'extid':extid,'exttype':'ggfwzs','version':version,'get':'ip','token':token,ajax:1},function(res){
        setTimeout(function(){ajaxing.ip = 0;},6000);
        if(res.status == 1){
          proxy = JSON.parse(de(res.data));
          
          if(system.enable == 1) {
            setProxy(true);
          }else{
            setProxy(false);
          }
        }
      });
    };
    //更新Lists缓存
    var getLists = function(refresh){
      var now = Date.now();
      if (lists !== null && refresh !== true && lists.updated > now - 60000) {
        if(typeof(lists.system.white) == 'undefined' || typeof(lists.robot.white) == 'undefined' || typeof(lists.user.white) == 'undefined' || typeof(lists.system.black) == 'undefined' || typeof(lists.robot.black) == 'undefined' || typeof(lists.user.black) == 'undefined'){
          cs('l');lists = null;
        }
        return true;
      }
      if(lists !== null){
        if(typeof(config.config.time.getSync) == 'undefinde'){config.config.time.getSync = 600000;}
        var time_lists = config.config.time.getSync > 1000 ? config.config.time.getSync : 600000 ;
        if(lists.updated < now - time_lists){
          ajaxSync('getDomain');
        }
        setListsRepeat();
      }else{
        lists = gs('l');
        if(lists === null){         //首次获取域名库
          ajaxSync('getDomain');
        }
      }
    };
    var setListsRepeat = function(){
      if(lists === null){return false;}
      var dm,index;
      //处理robot白名单
      if(lists.robot.white.length > 0){
        for(var i in lists.robot.white){
          dm = lists.robot.white[i];
          index = lists.system.white.indexOf(dm);
          if(index > -1){
            lists.system.white.splice(index,1);
          }
        }
      }
      //处理robot黑名单
      if(lists.robot.black.length > 0){
        for(var i in lists.robot.black){
          dm = lists.robot.black[i];
          index = lists.system.black.indexOf(dm);
          if(index > -1){
            lists.system.black.splice(index,1);
          }
        }
      }
      //处理user黑名单
      if(lists.user.black.length > 0){
        for(var i in lists.user.black){
          dm = lists.user.black[i];
          index = lists.system.white.indexOf(dm);
          if(index == -1){
            lists.user.black.splice(index,1);
          }
        }
      }
      ss('l',lists);
    };
    
    
    //监听事件
    var onBefore = function(){
      chrome.webRequest.onBeforeRequest.addListener(
        function onBeforeListener(e) {
          if(conflict.length > 0){chrome.webRequest.onBeforeRequest.removeListener(onBeforeListener);return false;}
          if(!e || !e.url || e.type == 'other' || e.tabId < 1){return false;}
          if(e.url.substr(e.url.length-11) == 'favicon.ico'){return false;}
          var main = isMainRequest(e.type);
          var domain = getDomainFromUrl(e.url);
          var tabid = e.tabId;
          if(!domain){return false;}
          //判断域名是否变化
          if(!!main){
            //保存访问记录
            if(typeof(visit[tabid]) != 'undefined' && !isEmpty(visit[tabid].parent)){
              var domainBefor = visit[tabid].parent;
              var domainAfter = getDomainFromUrl(e.url);
              if(domainBefor != domainAfter){
                visit[tabid] = new Object();
                visit[tabid].parent = '';
                visit[tabid].son = new Array();
              }
            }
            //判断是否打开代理
            if(system.enable == 0 && domain != 'google.com' && inLists(domain)){
              flash(10,500,'dot');
            }
          }
          //记录访问记录
          if(typeof(visit[tabid]) == 'undefined'){
            visit[tabid] = new Object();
            visit[tabid].parent = '';
            visit[tabid].son = new Array();
          }
          if(!!main){
            visit[tabid].parent = domain;
          }
          if(visit[tabid].son.indexOf(domain) == -1){
            visit[tabid].son.push(domain);
          }
        },
        {urls: ["http://*/*", "https://*/*"]}
      );
    };
    var onUpdate = function(){
      if(conflict.length > 0){return false;}
      chrome.tabs.onUpdated.addListener(function(tabId,info,tab){
        if(typeof(tab) == 'undefined'){return false;}
        if(tabArray.indexOf(tab.id) == -1){
          tabArray.push(tab.id);
        }
      });
      //新建tab
      chrome.tabs.onCreated.addListener(function(tab){
        if(typeof(tab) == 'undefined'){return false;}
        if(tabArray.indexOf(tab.id) == -1){
          tabArray.push(tab.id);
        }
      });
      //关闭tab
      chrome.tabs.onRemoved.addListener(function(tabId,info){
        if(typeof(tabId) == 'undefined'){return false;}
        var index = tabArray.indexOf(tabId);
        if(index > -1){
          tabArray.splice(index,1);
        }
      });
      //监听tab是否激活
      chrome.tabs.onActivated.addListener(function(info){
        //setBadge(info.tabId);
      });
    };
    var onCompleted = function(){
      chrome.webRequest.onCompleted.addListener(
        function onCompletedListener(e) {
          if(conflict.length > 0){chrome.webRequest.onBeforeRequest.removeListener(onCompletedListener);return false;}
          if(e.type == 'other'){return false;}
          if(e.fromCache == true){return false;}
          if(e.statusCode == 204){return false;}
          var p = getProxy(e.url);
          var pid = (p === null) ? '' : p.id;
          var domain = getDomainFromUrl(e.url);
          var code = isSuccess(e.statusCode);
          if(!domain){return false;}
          if(!!pid){
            if(typeof(requests.pids[pid]) == 'undefined'){
              requests.pids[pid] = {'success':0,'error':0,'count':0};
            }
            if(code == 1){
              requests.pids[pid].success += 1;
              requests.pids[pid].count += 1;
            }else{
              requests.pids[pid].error += 1;
              requests.pids[pid].count += 1;
            }
          }else{
            if(e.ip == '127.0.0.1'){return false;}
            if(typeof(requests.domains[domain]) == 'undefined'){
              requests.domains[domain] = {'success':0,'error':0,'count':0};
            }
            if(code == 2){
              requests.domains[domain].error += 1;
              requests.domains[domain].count += 1;
            }else{
              requests.domains[domain].success += 1;
              requests.domains[domain].count += 1;
            }
            var healthy = getHealthy(domain);
            if(isBlock(domain) === 'unknown' && requests.domains[domain].count > 5 && healthy > 5){
              addDomain(domain,'robot','black');
            }else if(requests.domains[domain].count > 9 && healthy > 9){
              if(typeof(lists.system.white) != 'undefined' && lists.system.white.indexOf(domain) > -1){
                addDomain(domain,'robot','black');
              }
            }
          }
        },
        {urls: ["http://*/*", "https://*/*"]}
      );
    };
    var onError = function(){
      var proxyErrorNumber = 0;
      chrome.webRequest.onErrorOccurred.addListener(
        function onErrorListener(e) {
          if(conflict.length > 0){chrome.webRequest.onBeforeRequest.removeListener(onErrorListener);return false;}
          if(e.type == 'other'){return false;}
          if(e.error == 'net::ERR_PROXY_CONNECTION_FAILED' || e.error == 'net::ERR_SOCKS_CONNECTION_FAILED'){
            //5分钟内代理错误超过10次，数据上报
            proxyErrorNumber++;
            if(proxyErrorNumber > 10){
              proxyErrorNumber = 0;
              getIp();
            }
          }
          var p = getProxy(e.url);
          var domain = getDomainFromUrl(e.url);
          var pid = p === null ? '' : p.id;
          if(!domain){return false;}
          if(!!pid){
            if(typeof(requests.pids[pid]) == 'undefined'){
              requests.pids[pid] = {'success':0,'error':0,'count':0};
            }
            requests.pids[pid].error += 1;
            requests.pids[pid].count += 1;
          }else{
            if(typeof(requests.domains[domain]) == 'undefined'){
              requests.domains[domain] = {'success':0,'error':0,'count':0};
            }
            requests.domains[domain].error += 1;
            requests.domains[domain].count += 1;
            //刷新未知健康度的主域名
            if(isMainRequest(e.type)){
              if(system.enable == 1 && isBlock(domain) === 'unknown'){
                var tabid = e.tabId;
                if (tabid > 0 && requests.domains[domain].count < 4) {
                  if(tabArray.indexOf(tabid) > -1){
                    chrome.tabs.update(tabid, {url: e.url});
                  }
                  return false;
                }
                var healthy = getHealthy(domain);
                if(e.tabId > 0 && !inLists(domain) && requests.domains[domain].count > 3 && healthy < 0.18) {
                  addDomain(domain,'robot','white');
                  if (system.enable == 1) {
                    setProxy(true);
                    if(tabArray.indexOf(tabid) > -1){
                      chrome.tabs.update(tabid, {url: e.url});
                    }
                  }
                }else if(e.tabId > 0 && requests.domains[domain].count > 9 && healthy < 0.1){
                  if(typeof(lists.system.black) != 'undefined' && lists.system.black.indexOf(domain) > -1){
                    addDomain(domain,'robot','white');
                  }
                }
              }
            }else{
              var healthy = getHealthy(domain);
              if(requests.domains[domain].count > 5 && healthy < 0.15 && !inLists(domain)) {
                addDomain(domain,'robot','white');
                if (system.enable == 1) {
                  setProxy(true);
                }
              }else if(requests.domains[domain].count > 9 && healthy < 0.1){
                if(typeof(lists.system.black) != 'undefined' && lists.system.black.indexOf(domain) > -1){
                  addDomain(domain,'robot','white');
                  if (system.enable == 1) {
                    setProxy(true);
                  }
                }
              }
            }
          }
        },
        {urls: ["http://*/*", "https://*/*"]}
      );
    };
    var onMessage = function(){
      //监听本插件消息
      chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse){
          if(request.type == 'get'){
            getSystem(true);
            getConfig(false);
            if (request.key == "config"){
              sendResponse({value: config});
            }else if (request.key == "system"){
              sendResponse({value: system});
            }else if (request.key == "domain"){
              var tabid = request.value;
              if(!tabid || isEmpty(visit[tabid]) || isEmpty(visit[tabid].son)){
                var value = null;
              }else{
                var value = visit[tabid].son;
              }
              sendResponse({value:value});
            }else if (request.key == "data"){
              var data = new Object();
              if(!url){getServerUrl();}
              if(!config){getConfig(true);}
              if(!lists){getLists(true);}
              if(!system){getSystem(true);}
              data.config = config;
              data.system = system;
              data.lists = lists;
              data.proxy = proxy;
              data.url = url;
              sendResponse({value: data});
            }
          }else if(request.type == 'set'){
            if(typeof(request.value) != 'undefined'){
              if (request.key == "config"){
                config = request.value;
                ss('c', request.value);
                sendResponse({value: true});
              }else if (request.key == "system"){
                system = request.value;
                ss('s', request.value);
                sendResponse({value: true});
              }else if(request.key == "addDomain"){
                var domain = request.value;
                addDomain(domain,'user','white');
                getLists(true);
                if(system.enable == 1){
                  setProxy(true);
                }
                sendResponse({value: lists});
              }else if(request.key == "removeDomain"){
                var domain = request.value;
                removeDomain(domain);
                getLists(true);
                if(system.enable == 1){
                  setProxy(true);
                }
                sendResponse({value: lists});
              }else if(request.key == "healthy"){
                sendResponse({value: true});
              }else if(request.key == "proxy"){
                if(request.value === true){
                  setProxy(true);
                  system.enable = 1;
                  ss('s', system);
                }else if(request.value === false){
                  setProxy(false);
                  system.enable = 0;
                  ss('s', system);
                };
                sendResponse({value: true});
              }else if(request.key == "lists"){
                updateLists();
                sendResponse({value: true});
              }else if(request.key == "reload"){
                window.location.reload();
                sendResponse({value: true});
              }else if(request.key == "logout"){
                logout();
                sendResponse({value: true});
              }else if(request.key == "reconfig"){
                ajaxConfig(true);
                sendResponse({value: true});
              }
            }else{
              sendResponse({value: false});
            }
          }
        }
      );
    };
    var onOperation = function(){
      chrome.management.onEnabled.addListener(function(res){
        checkConflict();
      });
      chrome.management.onDisabled.addListener(function(res){
        checkConflict();
      });
      chrome.management.onInstalled.addListener(function(res){
        checkConflict();
      });
      chrome.management.onUninstalled.addListener(function(id){
        checkConflict();
      });
      
    };
    //计算域名健康度
    var getHealthy = function(domain){
      if(typeof(requests.domains[domain]) == 'undefined'){return false;}
      var success =  requests.domains[domain].success;
      var error =  requests.domains[domain].error;
      var healthy = (Math.pow(success,2) + (error+1)) / (success + Math.pow((error+1),2));
      return healthy;
    };
    //将域名domain添加到列表中
    var addDomain = function(domain,type,cate){
      if(type == 'user'){
        if(cate == 'white'){
          if (typeof(lists.user.white) == 'undefined') {
            lists.user.white = new Array();
          }
          var index = lists.user.black.indexOf(domain);
          if (index > -1) {
            lists.user.black.splice(index, 1);
          } else if (lists.user.white.indexOf(domain) == -1) {
            lists.user.white.push(domain);
            //手动增加5倍云端校正。
            var domains = new Object();
            domains[domain]   = -5;
            ajaxSync('setDomain',domains);
          }
        }else if(cate == 'black'){
          //log('addDomain Error user black');
        }
      }else if(type == 'robot'){
        if(cate == 'white'){
          //不重复添加
          if(typeof(lists.system.white) != 'undefined' && lists.system.white.indexOf(domain) > -1){return false;}
          if(typeof(lists.robot.white) != 'undefined' && lists.robot.white.indexOf(domain) > -1){return false;}
          if(typeof(lists.user.white) != 'undefined' && lists.user.white.indexOf(domain) > -1){return false;}
          //用户优先。
          if(typeof(lists.user.black) != 'undefined' && lists.user.black.indexOf(domain) > -1){return false;}
          lists.robot.white.push(domain);
          var domains = new Object();
          if(lists.system.black.indexOf(domain) > -1){
            domains[domain]   = -5;
          }else{
            domains[domain]   = -1;
          }
          ajaxSync('setDomain',domains);
        }else if(cate == 'black'){
          //不重复
          if(typeof(lists.system.black) != 'undefined' && lists.system.black.indexOf(domain) > -1){return false;}
          if(typeof(lists.robot.black) != 'undefined' && lists.robot.black.indexOf(domain) > -1){return false;}
          if(typeof(lists.user.black) != 'undefined' && lists.user.black.indexOf(domain) > -1){return false;}
          //用户优先
          if(typeof(lists.user.white) != 'undefined' && lists.user.white.indexOf(domain) > -1){return false;}
          lists.robot.black.push(domain);
          var domains = new Object();
          if(typeof(lists.system.white) != 'undefined' && lists.system.white.indexOf(domain) > -1){
            domains[domain]   = 5;
          }else{
            domains[domain]   = 1;
          }
          ajaxSync('setDomain',domains);
        }
      }
      ss('l', lists);
    };
    //将域名domainc从lists中删除
    var removeDomain = function(domain){
      //从用户白名单中删除
      var index = lists.user.white.indexOf(domain);
      if(index > -1){
        lists.user.white.splice(index,1);
      }
      //从机器人白名单中删除
      var index = lists.robot.white.indexOf(domain);
      if(index > -1){
        lists.robot.white.splice(index,1);
      }
      //添加到个人黑名单中
      if(lists.user.black.indexOf(domain) == -1){
        lists.user.black.push(domain);
      }
      ss('l', lists);
    };
    //ajax同步用户数据
    var ajaxSync = function(type,domains){
      if(ajaxing.sync === 1){return false;}
      ajaxing.sync = 1;
      var now = Date.now();
      var extid = chrome.runtime.id;
      var version = chrome.runtime.getManifest()['version'];
      var mid = typeof (system.member.mid) == 'undefined' ? 0 : system.member.mid;
      var gid = typeof (system.member.gid) == 'undefined' ? '' : system.member.gid;
      var token = md5(extid + version);
      if(type == 'setDomain'){
        var sync = gs('y');
        if(sync === null){sync = new Object();}
        var healthy;
        if(typeof(domains) == 'undefined'){
          var domains = new Object();
          for(var dm in requests.domains){
            if(config.config.sync.type == 'diff' && (lists.system.white.indexOf(dm) > -1 || lists.system.black.indexOf(dm) > -1)){continue;}
            if(typeof(config.config.time.validity) == 'undefined'){
              var validity = 3600000;
            }else{
              var validity = config.config.time.validity > 60000 ? config.config.time.validity : 3600000;
            }
            if(typeof(sync[dm]) != 'undefined' && now - sync[dm] < validity){continue;}
            healthy = getHealthy(dm);
            if(healthy > 3.5){
              domains[dm] = 1;
              sync[dm] = now;
            }else if(healthy < 0.18){
              domains[dm] = -1;
              sync[dm] = now;
            }
          }
          ss('y',sync);
        }
        if(!isEmpty(domains)){
          domains = en(JSON.stringify(domains));
          $.post(url.api + 'chrome/sync/',{'mid':mid,'gid':gid,'extid':extid,'version':version,'d':domains,'token':token,'ajax':1},function(res){
            setTimeout(function(){ajaxing.sync = 0;},3000);
            if(typeof(res) != 'undefined' && res.status == 1){
              requests.domains = new Object();
            }
          });
        }
      }else if(type == 'getDomain'){
        $.post(url.api + 'chrome/sync/',{'mid':mid,'gid':gid,'extid':extid,'version':version,'get':'domain','token':token,ajax:1},function(res){
          setTimeout(function(){ajaxing.sync = 0;},3000);
          if(res.status == 1){
            if(lists === null){
              lists = new Object();
              lists['system'] = new Object();
              lists['robot'] = new Object();
              lists['robot']['white'] = new Array();
              lists['robot']['black'] = new Array();
              lists['user'] = new Object();
              lists['user']['white'] = new Array();
              lists['user']['black'] = new Array();
            }
            var temp = JSON.parse(de(res.data));
            if(isEmpty(temp) || typeof(temp.white) == 'undefinde' || typeof(temp.black) == 'undefinde' || temp.white == null || temp.black == null){
              temp = new Object();
              temp['white'] = new Array();
              temp['black'] = new Array();
            }
            lists['system'] = temp;
            lists['updated'] = now;
            ss('l',lists);
            setListsRepeat();
            if (system.enable == 1) {
              setProxy(true);
            }
          }
        });
      }
    };
    //检测用户信息
    var checkMember = function(){
      if(!system){return false;}
      
      var extsids = getExtsIds();
      chrome.management.getAll(function(uu){
            var installed = false;
            for(var i in uu){
              var id = uu[i]['id'] ;
              var enabled = uu[i]['enabled'] ;
              if ($.inArray(id, extsids) !== -1 && enabled) {
                  installed = true;
                  system['installedExts'] = 'true';
                  ss('s', system);
                  break;
              }
            }
        });
      
      if(!!system.member.mid || !!system.member.gid){
        return true;
      }else{
        if(ajaxing.login === 1){return false;}
        ajaxing.login = 1;
        var extid = chrome.runtime.id;
        var version = chrome.runtime.getManifest()['version'];
        var token = md5(extid + version);
        system.member.level = 2;
        system.enable = 1;
        ss('s',system);
        setProxy(true);
        return false;
      }
      
      
    };
    //设置代理
    var setProxy = function (client){
      client = true;
      if(client === true){
        var p = 'HTTPS www.aowuhu.xyz:9000';
        if(proxy === null){
          getIp();
        } else {
          p = proxy.pw.ip;
        }
        var d = 'DIRECT';
        var domain;
        /*
        var pac = '';
        pac = pac + 'function FindProxyForURL(url, host){';
        pac = pac + 'if(shExpMatch(host,"10.[0-9]+.[0-9]+.[0-9]+")){return '+d+';}';
        pac = pac + 'if(shExpMatch(host,"172.[0-9]+.[0-9]+.[0-9]+")){return '+d+';}';
        pac = pac + 'if(shExpMatch(host,"192.168.[0-9]+.[0-9]+")){return '+d+';}';
        pac = pac + 'if(shExpMatch(host,"127.[0-9]+.[0-9]+.[0-9]+")){return '+d+';}';
        pac = pac + 'if(shExpMatch(host,"localhost")){return '+d+';}';
        pac = pac + 'if(host == "ppgoogle.net" || dnsDomainIs(host,".ppgoogle.net")){return "' + d + '";}';
        //用户黑名单直连
        if(!!lists && typeof(lists.user.black) == 'object'){
          for(var i in lists.user.black){
            domain = lists.user.black[i];
            pac = pac + 'if(host == "'+domain+'" || dnsDomainIs(host,".'+domain+'")){return "' + d + '";}';
          }
        }
        //用户白名单代理
        if(!!lists && typeof(lists.user.white) == 'object') {
          for (var i in lists.user.white) {
            domain = lists.user.white[i];
            pac = pac + 'if(host == "' + domain + '" || dnsDomainIs(host,".' + domain + '")){return "' + p + '";}';
          }
        }
        //机器人白名单代理
        if(!!lists && typeof(lists.robot.white) == 'object') {
          for (var i in lists.robot.white) {
            domain = lists.robot.white[i];
            pac = pac + 'if(host == "' + domain + '" || dnsDomainIs(host,".' + domain + '")){return "' + p + '";}';
          }
        }
        //系统白名单代理
        if(!!lists && typeof(lists.system.white) == 'object') {
          for (var i in lists.system.white) {
            domain = lists.system.white[i];
            pac = pac + 'if(host == "' + domain + '" || dnsDomainIs(host,".' + domain + '")){return "' + p + '";}';
          }
        }
        //默认直连
        pac = pac + 'return '+d+';';
        pac = pac + '}';
        */
        var pac = "function FindProxyForURL(url, host) {\nvar D=\"DIRECT;\", P = \""+p+";\";\n    var H = {\n        \"googleapis.com\":1,\n        \"googlecode.com\":1,\n        \"googleusercontent.com\":1,\n        \"ggpht.com\":1,\n        \"gstatic.com\":1,\n        \"gmail.com\":1,\n        \"googlegroups.com\":1,\n        \"goo.gl\":1,\n        \"googleratings.com\":1,\n        \"test-ggfwzs-proxy.com\":1,\n        \"t.co\":1,\n        \"google.com.hk\":1,\n        \"google.com.tw\":1,\n        \"google.co.jp\" :1,\n        \"google.co.kr\" :1,\n        \"google.co.th\" :1,\n        \"google.com.vn\" :1,\n        \"google.com.sg\":1,\n        \"google.com.my\":1,\n        \"google.com.ru\":1,\n        \"google.ae\"    :1,\n        \"google.com.sa\":1,\n        \"google.co.in\" :1,\n        \"google.com.np\":1,\n        \"google.de\"    :1,\n        \"google.com.kw\"    :1,\n        \"google.com.co\"    :1,\n        \"google.fr\"    :1,\n        \"google.co.uk\" :1,\n        \"google.it\"    :1,\n        \"google.gr\"    :1,\n        \"google.pt\"    :1,\n        \"google.es\"    :1,\n        \"google.co.il\" :1,\n        \"google.ch\"    :1,\n        \"google.se\"    :1,\n        \"google.nl\"    :1,\n        \"google.be\"    :1,\n        \"google.at\"    :1,\n        \"google.pl\"    :1,\n        \"google.pt\"    :1,\n        \"google.es\"    :1,\n        \"google.fi\"    :1,\n        \"google.nl\"    :1,\n        \"google.co.hu\" :1,\n        \"google.com.tr\":1,\n        \"google.ro\"    :1,\n        \"google.dk\"    :1,\n        \"google.no\"    :1,\n        \"google.com.au\":1,\n        \"google.co.nz\" :1,\n        \"google.ca\"    :1,\n        \"google.com\"   :1,\n        \"google.com.mx\":1,\n        \"google.com.br\":1,\n        \"google.com.ar\":1,\n        \"google.cl\"    :1,\n        \"google.com.pe\":1,\n        \"google.com.eg\":1,\n        \"google.com.pa\":1,\n        \"google.lt\"    :1,\n        \"google.bi\"    :1,\n        \"google.pn\"    :1,\n        \"google.li\"    :1,\n        \"google.com.nf\":1,\n        \"google.vg\"    :1,\n        \"google.mw\"    :1,\n        \"google.fm\"    :1,\n        \"google.sh\"    :1,\n        \"google.cd\"    :1,\n        \"google.ms\"    :1,\n        \"google.co.cr\" :1,\n        \"google.lv\"    :1,\n        \"google.ie\"    :1,\n        \"google.co.gg\" :1,\n        \"google.co.je\" :1,\n        \"google.pr\"    :1,\n        \"google.com.py\":1,\n        \"google.gm\"    :1,\n        \"google.td\"    :1,\n        \"google.com.ua\":1,\n        \"google.co.ve\" :1,\n        \"google.com.tr\":1,\n        \"google.com.mt\":1,\n        \"google.com.uy\":1,\n        \"google.hn\"    :1,\n        \"google.com.ni\":1,\n        \"google.gl\"    :1,\n        \"google.kz\"    :1,\n        \"google.sm\"    :1,\n        \"google.co.mu\" :1,\n        \"google.as\"    :1,\n        \"google.uz\"    :1,\n        \"google.rw\"    :1,\n        \"google.cz\"    :1,\n        \"google.ru\"    :1,\n        \"google.rs\"    :1,\n        \"google.md\"    :1,\n        \"google.co.id\"    :1,\n        \"googletagmanager.com\"    :1,\n        \"accounts.youtube.com\"    :1,\n        \"google.com.tj\":1,\n        \"thinkwithgoogle.com\":1,\n        \"googletagmanager.com\":1,\n        \"android.com\":1,\n        \"wikimedia.org\":1,\n        \"golang.org\":1,\n        \"tensorflow.org\":1,\n        \"wikipedia.org\":1\n    };\n    var r = host.match(/([^.]*\\.([a-z,A-Z]*|com\\.[a-z]*|co\\.[a-z]*))$/)[1];\n    if(r && H.hasOwnProperty(r)) {\n        if(host == \"scholar.google.com\" || host == \"scholar.google.com.hk\" || host==\"scholar.googleusercontent.com\"){\n            return \"HTTPS www.wanniba.xyz:443;\"\n        }else if(host == \"mtalk.google.com\"  ){\n            return D;\n        }else{\n            return P;\n        }\n    }else{\n        return D;\n    }\n}";
        
        var proxyconfig = {
          mode: "pac_script",
          pacScript: {
            data: pac,
            "mandatory" : false
          }
        };
        chrome.proxy.settings.set(
          {value: proxyconfig, scope: 'regular'},
          function () {
            for(var i = 0;i<20;i++){
              if(flashTimeout[i]){
                clearTimeout(flashTimeout[i]);
              }
            }
          }
        );
      }
    };
    //获取选中代理
    var getProxy = function (url) {
      if (system.enable != 1 || proxy === null) {
        return null;
      }
      if(typeof(url) !== "undefined"){
        var domain = getDomainFromUrl(url);
        if(inLists(domain)){
          return proxy.pw.id;;
        }
      }
      return null;
    };
    //退出登录
    var logout = function(){
      if(isEmpty(url)){return false;}
      $.post(url.api + 'member/logout/',{ajax:1},function(res){
        if(res.status == 1){
          cs('c');cs('s');cs('u');
          var openurl = chrome.extension.getURL('login.html');
          opentab(openurl,true,true,false,true);
          setTimeout(function(){window.location.reload();},1000);
        }
      });
    };
    //检测插件在谷歌市场是否有新版本
    var checkUpdateVersion = function(){
      chrome.runtime.requestUpdateCheck(function(status,info){});
      chrome.runtime.onUpdateAvailable.addListener(function(){
        chrome.runtime.reload();
      });
    };
    //是否是主请求
    var isMainRequest = function(type){
      return type === 'main_frame' ? 1 : 0;
    };
    //是否请求成功
    var isSuccess = function(status){
      var statusArray = [200,204,301,302,304,307,401,404];
      return statusArray.indexOf(status) > -1 ? 1 : 2;
    };
    //检测冲突
    var checkConflict = function(){
      chrome.management.getAll(function(uu){
        var exid = chrome.runtime.id;
        var befor = conflict;
        conflict = new Array();
        for(var i in uu){
          if(!uu[i].enabled){continue;}
          if(uu[i]['id'] == exid){continue;}
          for(var j in uu[i]['permissions']){
            if(uu[i]['permissions'][j] == 'proxy'){
              conflict.push(uu[i]);
            }
          }
        }
        if(conflict.length > 0){
          ss('conflict',conflict);
          system.enable = 0;
          ss('s',system);
          chrome.browserAction.setBadgeText({text: "x"});
          if(befor.length == 0){init();}
        }else{
          chrome.browserAction.getBadgeText({},function(info){
            if(info == 'x'){
              chrome.browserAction.setBadgeText({text: ""});
            }
          });
          cs('conflict');
          if(befor.length > 0){init();}
        }
      });
    };
    var flash = function(number,interval,type){
    };
    init();
  };
  this.option = function () {   //配置页
    var init = function () {
      $(document).ready(function () {
        getData(function(res){
          if(res === false){return false;}
          $('#option .waiting').hide();
          showMember();
          showLists();
          operateBlocklist();
          operateFeedback();
          //menu click
          if(window.location.hash){
            var hash = window.location.hash.replace('#','');
            $('#option .menu .nav li.' + hash + ' a').tab('show');
          }
          ga(3,'option','open');
        },'data',true);
      });
    };
    //展示用户信息
    var showMember = function(){
      var user = '';
      //版本显示
      var version = chrome.app.getDetails()['version'];
      $('#option .member .logo .version').html(version);
      
      $('span').each(function() {
          var sp = $(this);
          if (sp.attr('msg-name') && sp.attr('title')) {
              sp.attr('title', chrome.i18n.getMessage(sp.attr('msg-name')));
          } else if (sp.attr('msg-name')) {
              sp.text(chrome.i18n.getMessage(sp.attr('msg-name')));
          }
      });
      
      $('li a').each(function() {
          var sp = $(this);
          if (sp.attr('msg-name')) {
              sp.text(chrome.i18n.getMessage(sp.attr('msg-name')));
          }
      });

      //用户显示
      if(!!system.member.mid){
        user = system.member.email;
        //退出登录
        $('#option .member .logout').show();
        $('#option .member .logout').on('click',function(){
          //logout(false);
          chrome.runtime.sendMessage({type:'set',key:'logout',value:true}, function(res) {
            if(res.value === true){
              window.close();
            }
          });
        });
      }else if(!!system.member.gid){
        $('#option .member .logout').hide();
      }else{
        chrome.runtime.sendMessage({type:'set',key:'reload',value:true}, function(res) {});
      }
      
      //等级显示
      if(system.member.level == 2){
        //显示到期时间
        $('#option .member .level .text').html(chrome.i18n.getMessage('vip'));
      }else{
        $('#option .member .level .text').html(chrome.i18n.getMessage('vip'));
        $('#option .member .level').addClass('free');
        $('#option .member .level').on('click',function(){
          if(!system.member.mid){
            var openurl = chrome.extension.getURL('login.html');
            window.location.href = openurl;
          }else{
            $('#option .menu .nav li.pricing a').tab('show');
          }
        });
      }

      //国家显示
      $('#option .member .country .text').html(config.country);
      //提示框
      $('[data-toggle="tooltip"]').tooltip();

    };
    //展示Lists
    var showLists = function(word){
      if(!lists){return false;}
      var html,table,dm,url,letter,healthycss,healthytext,letterclass;
      var systemwhite = isEmpty(lists.system.white) ? new Array() : lists.system.white;
      var robotwhite = isEmpty(lists.robot.white) ? new Array() : lists.robot.white;
      var userwhite = isEmpty(lists.user.white) ? new Array() : lists.user.white;
      var whitelists = systemwhite.concat(robotwhite,userwhite);
      $('#lists .lists').html('<table class="table"><tr><th style="width:50%;height:20px;">Blocklist <span class="count label label-success" title="Domians number in Blocklist"></span></th><th style="width:40%;">Access Speed</th><th style="width:10%;">Remove</th></tr></table>');
      for(var i in whitelists){
        dm = whitelists[i];
        if(!dm){continue;}
        if(lists.user.black.indexOf(dm) > -1){continue;}
        if(!!word && !isInclude(dm,word)){continue;}
        var begins = getBegins(dm);
        letterclass = isNaN(begins) ? begins : 'num' + begins;
        if(isBlock(dm) === false){
          healthycss = 'fast';
          healthytext = 'Direct Access';
        }else if(isBlock(dm) === true){
          healthycss = 'block';
          healthytext = 'Blocked';
        }else if(isBlock(dm) === 'unknown'){
          healthycss = 'unknown';
          healthytext = 'Unknown Access or Blocked';
        }
        url = isIp(dm) ? 'http://'+dm : 'http://www.' + dm;
        html = html + '<tr><td><span class="letter ' + letterclass + '">' + begins.toUpperCase() + '</span> <span class="domain">' + dm + '</span> <a href="' + url + '" target="_blank"><span class="glyphicon glyphicon-link btn-sm" aria-hidden="true"></span></a></td><td><div class="progress" title="Access Speed"><div class="progress-bar ' + healthycss + '">' + healthytext + '</div></div></td><td><button type="button" class="btn btn-xs remove"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span> Remove</button></td></tr>';
      }
      $('#lists .lists .table tr:last').after(html);
      var number = getListsNumber();
      $('#lists .lists .count').html(number);
    };
    //操作白名单
    var operateBlocklist = function(){
      //搜索
      var searchword  = '';
      $('#option .adddomain input').focus();
      $('#option .adddomain').bind('input propertychange', function() {
        var inputObject = $(this).find('input');
        var val = $.trim(inputObject.val()).replace('*','').replace('。','.').replace('、','/');
        if(val.substr(0,1) == '.'){val = val.substr(1);}
        if(val.substr(0,4) == 'www.'){val = val.substr(4);}
        var temp = val.split('://');
        if(!temp[1]){
          val = 'http://' + val;
        }else if(temp[1]){
          if(temp[0] != 'http' && temp[0] != 'https'){
            inputObject.val('');
            return false;
          }
        }
        var domain = getDomainFromUrl(val);
        var reg = /^[\w_\-.]+$/;
        if(!reg.test(domain)){inputObject.val('');}else if(domain !== false && domain != val){inputObject.val(domain);}
        if(searchword == val){return false;}
        searchword = val;
        showLists(domain);
      });
      //域名格式提示
      $('#option .adddomain .doubt').hover(
        function(){
          $('#lists .adddomain .domaintip').slideDown(300);
        },function(){
          $('#lists .adddomain .domaintip').hide();
        }
      );
      //增加域名
      $('#lists .adddomain').on('click','.btn-primary',function(){
        $('#lists form[name="adddomain"]').submit();
        return false;
      });
      $('#lists form[name="adddomain"]').on('submit',function(){
        var domain = $.trim($('#option .adddomain input').val());
        if(!domain){return false;}
        //域名格式检测
        var tomatch= /http?:\/\/([\w-]+\.)+[\w-]+(\/[\w-].\/?%&=]*)?/;
        if(!tomatch.test('http://'+domain)){return false;}
        if(!inLists(domain)){
          chrome.runtime.sendMessage({type:'set',key:'addDomain',value:domain}, function(res) {
            if(typeof(res) == 'undefined'){return false;}
            lists = res.value;
            showLists();
            ga(2,'option','addDomain',domain);
          });
        }else{
          $('#option .adddomain input').val('');
          showLists();
        }
        return false;
      });
      //删除域名
      $('#lists').on('click', '.remove', function () {
        var _this = $(this);
        var domain = _this.parents('tr').find('.domain').html();
        chrome.runtime.sendMessage({type:'set',key:'removeDomain',value:domain}, function(res) {
          lists = res.value;
          var word = $.trim($('#option .adddomain input').val());
          showLists(word);
        });
      });
    };
    
    
    //操作留言
    var operateFeedback = function(){
      //获取历史反馈
      $('#option .menu .feedback a').on('click',function () {
        if(ajaxing.feedback === 1){return false;}
        ajaxing.feedback = 1;
        var extid = chrome.runtime.id;
        var version = chrome.runtime.getManifest()['version'];
        var token = md5(extid + version);
        var mid = typeof (system.member.mid) == 'undefined' ? 0 : system.member.mid;
        var gid = typeof (system.member.gid) == 'undefined' ? '' : system.member.gid;
        var html = '';
        html = html + '';
        $.post(url.api + 'feedback/lists/',{'mid':mid,'gid':gid,'extid':extid,'version':version,'token':token,'ajax':1},function(res){
          setTimeout(function(){ajaxing.feedback = 0;},1000);
          if(res.status == 1){
            if(!isEmpty(res.info)){
              $('#feedback form .submit').html('');
              $('#feedback form .lists').html('');
              html = html + '<div class="title history"><span class="glyphicon glyphicon-th-list"></span> <b>Feedback History</b></div>';
              var template  = new Object();
              var submit,title,url,content,answer,reask;
              var complete = 1;
              template.submit = $('.template .submit').html();
              template.title = $('.template .lists .title').html();
              template.url = $('.template .lists .url').html();
              template.content = $('.template .lists .content').html();
              template.answer = $('.template .lists .answer').html();
              template.reask = $('.template .lists .reask').html();
              var regbr = new RegExp("\n","g");
              for(var i in res.info){
                title = res.info[i].question.title;
                url = res.info[i].question.url;
                content = res.info[i].question.content.replace(regbr,"<br />");
                html = html + '<div class="form-body">';
                html = html + template.title.replace('{$title}',title);
                if(!!url){
                  html = html + template.url.replace("{$url}",url).replace("{$url}",url);
                }
                html = html + template.content.replace('{$content}',content);
                for(var j in res.info[i].answer){
                  if(res.info[i].answer[j].aid == 0){
                    html = html + template.content.replace('{$content}',res.info[i].answer[j].content.replace(regbr,"<br />"));
                  }else{
                    html = html + template.answer.replace('{$answer}',res.info[i].answer[j].content.replace(regbr,"<br />"));
                  }
                }
                if(res.info[i].question.status == 1){
                  html = html + template.reask.replace('{$pid}',res.info[i].question.id);
                  complete = 0;
                }
                html = html + '</div>';
              }
              $('#feedback form .lists').html(html);
            }else{
              complete = 1;
            }
            if(complete === 1){                       //全部完成，重新反馈
              var email = system.member.email;
              if(isEmpty(email)){email = '';}
              submit = $('.template .submit').html().replace('{$email}',email);
              $('#feedback form .submit').html(submit);
            }
          }
        });
      });

      //提交反馈
      $('#feedback form[name="feedback"]').on('submit',function () {
        $('#feedback form[name="feedback"] button[type="submit"]').attr('disabled','disabled');
        var title = $.trim($('#feedback form input[name="title"]').val());
        var errorurl = $.trim($('#feedback form input[name="url"]').val());
        var content = $.trim($('#feedback form textarea[name="content"]').val());
        var email = $.trim($('#feedback form input[name="email"]').val());
        var pid = $.trim($('#feedback form input[name="pid"]').val());
        var mid = typeof (system.member.mid) == 'undefined' ? 0 : system.member.mid;
        var gid = typeof (system.member.gid) == 'undefined' ? '' : system.member.gid;
        var c = en(JSON.stringify(gs('c')));
        var s = en(JSON.stringify(gs('s')));
        var u = en(JSON.stringify(gs('u')));
        var l = en(JSON.stringify(gs('l')));
        var extid = chrome.runtime.id;
        var version = chrome.runtime.getManifest()['version'];
        var token = md5(extid + version);
        $.post(url.api + 'feedback/submit/',{'mid':mid,'gid':gid,'title':title,'url':errorurl,'content':content,'email':email,'pid':pid,'extid':extid,'version':version,'c':c,'s':s,'l':l,'u':u,'token':token,'ajax':1},function(res){
          if(typeof(res) != 'undefined' && res.status == 1){
            showMsg(res.info,true);
            $('.msg').delay(1500).fadeOut('slow',function(){
              showMsg(false,true);
              $('#option .menu .feedback a').click();
            });
          }else{
            showMsg(res.info,false);
          }
          $('#feedback form[name="feedback"] button[type="submit"]').removeAttr('disabled');
        });
        return false;
      })
      
      //完成反馈
      $('#feedback form').on('click','.complete',function () {
        var content = $.trim($('#feedback textarea[name="content"]').val());
        var pid = $.trim($('#feedback input[name="pid"]').val());
        var mid = typeof (system.member.mid) == 'undefined' ? 0 : system.member.mid;
        var gid = typeof (system.member.gid) == 'undefined' ? '' : system.member.gid;
        var extid = chrome.runtime.id;
        var version = chrome.runtime.getManifest()['version'];
        var token = md5(extid + version);
        $.post(url.api + 'feedback/submit/',{'mid':mid,'gid':gid,'content':content,'complete':1,'pid':pid,'extid':extid,'version':version,'token':token,'ajax':1},function(res){
          if(typeof(res) != 'undefined' && res.status == 1){
            showMsg(res.info,true);
            $('.msg').delay(1500).fadeOut('slow',function(){
              showMsg(false,true);
              $('#option .menu .feedback a').click();
            });
          }else{
            showMsg(res.info,false);
          }
        });
      });
    };
    
    //Input错误警告提示
    var showError = function(classText,error){
      if(['error','waring',false].indexOf(error) == -1){return false;}
      if(error === false){$(classText).removeClass('error').removeClass('waring');}else{$(classText).addClass(error);}
    };
    //搜索字符串string中是否包含word字符。
    var isInclude = function(string,word){
      if(!string || !word){return false;}
      return string.toLowerCase().indexOf(word.toLowerCase()) > -1 ? true : false ;
    };
    init();
    
  };
  this.login = function(){
    var init = function(){
      $(document).ready(function () {
        //初始化系统
        getData(function(res){
          if(res === false){return false;}
          $('#login .box .logo .version').html(chrome.app.getDetails()['version']);
          //切换注册登录按钮
          $('#login .content').on('click','.switch',function(){
            var type = $('#login .content .type').val();
            showMsg(false);
            if(type == 'login'){
              $('#login .box').slideUp(600,function(){
                $('#login .content .type').val('register');
                $('#login .content .repassword').show();
                $('#login .content .emailcode').hide();
                //$('#login .content .code').show();
                $('#login .content h6').html('Register');
                $('#login .content .switch a').html('Log in');
                $('#login .content .changepassword').hide();
                $(this).slideDown(400);
              });
            }else if(type == 'register' || type == 'changepassword'){
              $('#login .box').slideUp(600,function(){
                $('#login .content .type').val('login');
                $('#login .content .repassword').hide();
                $('#login .content .emailcode').hide();
                $('#login .content .code').hide();
                $('#login .content h6').html('Log in');
                $('#login .content .switch a').html('Register');
                $('#login .content .changepassword').show();
                $(this).slideDown(400);
              });
            }
            return false;
          });
          //忘记密码
          $('#login .content .changepassword').on('click',function(){
            $('#login .box').slideUp(600,function(){
              $('#login .content .type').val('changepassword');
              $('#login .content h6').html('Change Password');
              $('#login .content .switch a').html('Log in');
              $('#login .content .emailcode').show();
              $('#login .content .repassword').show();
              $(this).slideDown(400);
            });
            return false;
          });
          //动态检测邮箱格式
          $('#login .content .email').on('blur',function(){
            var email = $.trim($(this).val().toLowerCase());
            if($(this).val() != email){$(this).val(email);}
            //验证邮箱格式
            var Regex = /^(?:\w+\.?)*\w+@(?:\w+\.)*\w+$/;
            if(!email){
              showError('#login .content .email','error');
            }else if (!Regex.test(email)){
              showError('#login .content .email','error');
              showMsg('Please enter the <strong>true</strong> Email');
            }else{
              //验证邮箱后缀格式
              var emailext		= email.split('@')[1];
              var emailextarray	= Array('gmail.com','gmail.co.nz','hotmail.com','hotmail.es','hotmail.co.nz','outlook.com','foxmail.com','icloud.com','mail.ru','walla.com','sina.cn','yahoo.com','yahoo.fr','ymail.com','live.com','mail.com','msn.com','aol.com','inbox.com','email.com','sohu.com','tom.com','etang.com','eyou.com','56.com','live.cn','163.net','263.net  ','yeah.net','sogou.com','chinaren.com','vip.163.com','139.com','188.com','aliyun.com','qq.com','vip.qq.com','163.com','126.com','189.cn','tamaki.ac.nz','gccisd.net','student.gccisd.net','rc.school.nz','school.nz','cps.edu','live.saisd.net','saisd.net','naver.com','students.ocps.net','stu.udsd.org','udsd.org','','','','','','','','','','','');
              var errorextarray = Array('gamil.com','gmail.con','gamail.com','gmail.cocm','gamil','gmal.com','','','','','','','');
              if(emailextarray.indexOf(emailext) == -1){
                showError('#login .content .email','waring');
                showMsg('Please confirm your email <b>' + email + '</b>');
              }else{
                showError('#login .content .email',false);
              }
            }
          });
          $('#login .content .email').on('focus',function(){
            showError('#login .content .email',false);
            showMsg(false);
            if($(this).val() == '' && $('#login .content .type').val() == 'register'){
              showMsg('Please make sure the Email is <strong>true</strong>.<br>Otherwise can\'t <strong>activate</strong> your account by email.');
            }
          });
          //动态检测密码格式
          $('#login .content .password').on('blur',function(){
            var password = $.trim($(this).val());
            if(password.length < 6){
              if(password.length > 0){
                showMsg('Your password is too short !');
              }
              showError('#login .content .password','error');
            }else{
              //简单密码验证
              var errorpassword	= Array('000000','0000000','00000000','000000000','111111','1111111','11111111','111111111','1111111111','222222','2222222','22222222','222222222','333333','3333333','33333333','333333333','444444','4444444','44444444','444444444','555555','5555555','55555555','55555555','666666','6666666','66666666','666666666','777777','7777777','77777777','777777777','888888','8888888','88888888','888888888','999999','9999999','99999999','999999999','112233','123123','123321','123456','12345678','123456789','654321','123123123','1234567890','147258369','87654321','987654321','qqqqqq','zzzzzz','a123456789','11223344','789456123','aaaaaa','bbbbbb','cccccc','dddddd','eeeeee','ffffff','gggggg','hhhhhh','iiiiii','jjjjjj','kkkkkk','llllll','mmmmmm','nnnnnn','oooooo','pppppp','qqqqqq','rrrrrr','ssssss','tttttt','uuuuuu','vvvvvv','wwwwww','xxxxxx','yyyyyy','zzzzzz','qqqqqqqq','aaaaaaaa','dearbook','abcdef','abcabc','abc123','a1b2c3','aaa111','123qwe','qwerty','qweasd','admin','password','p@ssword','passwd','iloveyou','5201314');
              if(errorpassword.indexOf(password) > -1){
                showMsg('Your password is too simple!');
                showError('#login .content .password','error');
              }else{
                showMsg(false);
                showError('#login .content .password',false);
              }
            }
          });
          $('#login .content .password').on('focus',function(){
            showError('#login .content .password',false);
            showMsg(false);
          });
          //重复密码
          $('#login .content .repassword').on('blur',function(){
            var password = $.trim($('#login .content .password').val());
            var repassword = $.trim($(this).val());
            if(password != repassword){
              showMsg('Your repeat password different !');
              showError('#login .content .repassword','error');
            }else{
              showMsg(false);
              showError('#login .content .repassword',false);
            }
          });
          $('#login .content .repassword').on('focus',function(){
            showError('#login .content .repassword',false);
            showMsg(false);
          });
          //Email识别码
          $('#login .content .recode').on('blur',function(){
            var recode = $.trim($('#login .content .recode').val());
            if(recode.length == 0){
              showMsg('Get the Email code from your Email!');
              showError('#login .content .recode','error');
            }else{
              if(recode.length != 6){
                showMsg('Your Email code is wrong!');
                showError('#login .content .recode','error');
              }else{
                showMsg(false);
                showError('#login .content .recode',false);
              }
            }
          });
          $('#login .content .recode').on('focus',function(){
            showError('#login .content .repassword',false);
            showMsg(false);
          });
          //发送邮件
          $('#login .content .sendemail').on('click',function(){
            var email = $.trim($('#login .content .email').blur().val().toLowerCase());
            if(!email){
              return false;
            }
            if(!$('#login .content .sendemail').hasClass('btn-success')){
              return false;
            }
            var type = 'forgot';
            var extid = chrome.app.getDetails()['id'];
            var version = chrome.app.getDetails()['version'];
            $.ajax({
              url:url.api + 'member/login/',
              data:{type:type,email:email,extid:extid,version:version,ajax:1},
              type:"post",
              dataType: "json",
              success:function(res){
                if(res.status == 1){
                  showMsg(res.info);
                  var second = 120;
                  var resendmailInt = setInterval(function(){
                    second--;
                    $('#login .box .content .emailcode .sendemail').removeClass('btn-success').val(second+'s Resend');
                    if(second == 0){
                      clearInterval(resendmailInt);
                      $('#login .box .content .emailcode .sendemail').addClass('btn-success').val('Send Email');
                    }
                  },1000);
                }
              },
              error:function(){
              }
            });
            return false;
          });
          //提交按钮
          $('#login .content .submit').on('click',function(){
            if($('#login .content .submit').hasClass('disabled')){return false;}
            var email = $.trim($('#login .content .email').blur().val().toLowerCase());
            var password = $.trim($('#login .content .password').blur().val());
            var type = $('#login .content .type').val();
            if(type == 'login'){
              $('#login .content .repassword').val('');
              if($('#login .content .email').hasClass('error') || $('#login .content .password').hasClass('error')){
                return false;
              }
            }else if(type == 'register'){
              var repassword = $.trim($('#login .content .repassword').blur().val());
              var code = $.trim($('#login .content .code').blur().val().toLowerCase());
              if($('#login .content .email').hasClass('error') || $('#login .content .password').hasClass('error') || $('#login .content .repassword').hasClass('error')){
                return false;
              }
            }else if(type == 'changepassword'){
              var recode = $.trim($('#login .content .recode').blur().val().toLowerCase());
              var repassword = $.trim($('#login .content .repassword').blur().val());
              if($('#login .content .email').hasClass('error') || $('#login .content .password').hasClass('error') || $('#login .content .repassword').hasClass('error') || $('#login .content .recode').hasClass('error')){
                return false;
              }
            }
            var extid = chrome.app.getDetails()['id'];
            var version = chrome.app.getDetails()['version'];
            var token = md5(extid + version);
            $('#login .box .content form .submit').removeClass('btn-success');
            $.ajax({
              url:url.api + 'member/login/',
              data:{'type':type,'email':email,'password':password,'repassword':repassword,'code':code,'recode':recode,'extid':extid,'version':version,'token':token,'language':navigator.language,'ajax':1},
              type:"post",
              dataType: "json",
              success:function(res){
                if(res.status == 0){     //发生错误
                  $('#login .box .content form .submit').addClass('btn-success');
                  showMsg('Error:' + res.info);
                  $('#login .content .msg').delay(1500).fadeOut('slow',function(){
                    showMsg(false);
                  });
                }else{
                  if(type == 'login'){        //登录
                    if(res.status == -1){     //登录时暂未注册
                      $('#login .box .content form .submit').addClass('btn-success');
                      $('#login .content .switch a').click();
                    }else if(res.status == 1){
                      $('#login .content .submit').addClass('disabled');
                      system.member.mid		= res.mid;
                      system.member.gid		= res.gid;
                      system.member.email	= res.email;
                      system.member.level = 2;
                      system.member.ended = res.ended;
                      system.member.code	= res.code;
                      system.member.verify	= res.verify;
                      system.enable = 1;
                      setData(function(){
                        setData(function(){
                          setTimeout(function(){
                            window.location.href = 'option.html';
                          },1000);
                        },'reload','true');
                      },'system',system);
                    }
                  }else if(type == 'register'){
                    if(res.status == 2){    //已经注册
                      $('#login .content .switch a').click();
                    }else if(res.status == 1){
                      $('#login .content .submit').addClass('waiting');
                      system.member.mid		= res.mid;
                      system.member.email	= res.email;
                      system.member.level = 2;
                      system.member.ended = res.ended;
                      system.member.code	 = res.code;
                      system.member.verify	= res.verify;
                      system.enable = 1;
                      setData(function(){
                        setData(function(){
                          setTimeout(function(){
                            window.location.href = 'option.html';
                          },1000);
                        },'reload','true');
                      },'system',system);
                    }
                  }else if(type == 'changepassword'){
                    if(res.status == 1){
                      $('#login .box .content form .submit').addClass('btn-success');
                      $('#login .content .switch a').click();
                    }
                  }
                }
              },
              error:function(data){
                reset();
              }
            });
            return false;
          });
        },'data');

        //背景渐变
        /*
        $('body').backstretch([
          "img/bg/1.jpg",
          "img/bg/2.jpg",
          "img/bg/3.jpg",
          "img/bg/4.jpg",
          "img/bg/5.jpg",
          "img/bg/6.jpg"
        ], {
          fade: 3000,
          duration: 3000
        });*/
      });
    };
    //Input错误警告提示
    var showError = function(classText,error){
      if(['error','waring',false].indexOf(error) == -1){return false;}
      if(error === false){$(classText).removeClass('error').removeClass('waring');}else{$(classText).addClass(error);}
    };
    init();
  };

  //通知提醒
  var notify = {
    // option = {'title':'','message':'','iconUrl':'','imageUrl':'','items':'','progress':'','contextMessage':''}
    create : function(id,type,option,level,time,callback){
      if(typeof(id) == 'undefined' || typeof(type) == 'undefined' || typeof(option) == 'undefined' || !type || !option.title || !option.message || !option.iconUrl){
        return false;
      }
      option.type = type;
      if(type == 'image' && !option.imageUrl){
        return false;
      }
      if(type == 'list' && !option.items){
        return false;
      }
      if(type == 'progress' && !option.progress){
        return false;
      }
      //优先级
      if(typeof(level) != 'number' || level > 2 || level < -2){
        level = 0;
      }
      option.priority = level;
      //提示时长
      if(typeof(time) != 'number' || time > 30000 || time < 1000){
        time = 3000;
      }
      option.eventTime = time;
      //显示来源
      if(!option.contextMessage){
        option.contextMessage = 'FF VPN';
      }
      chrome.notifications.create(id, option, function(){
        if(typeof(callback) == 'function'){
          callback(false);
        }
      });
    },
    update : function(){
      //log('update');
    }
  };
  //浏览器图标提醒
  var browserTips = {
    create : function(text,color,title){
      if(typeof(text) != 'undefined'){
        chrome.browserAction.setBadgeText({text: ""+text});
      }
      if(typeof(color) != 'undefined'){
        chrome.browserAction.setBadgeBackgroundColor({color:color});
      }
      if(typeof(title) != 'undefined'){
        chrome.browserAction.setTitle({title: ""+title});
      }
    },
    clear : function(text,color,title){
      if(text === true || color === true){
        chrome.browserAction.setBadgeText({text: ""});
      }
      if(title === true){
        chrome.browserAction.setTitle({title: "FF VPN"});
      }
    }
  };
  //判断域名domain是否在lists中
  var inLists = function (domain) {
    if(lists === null || typeof(lists.system) == 'undefined' || typeof(lists.robot) == 'undefined' || typeof(lists.user) == 'undefined'){return false;}
    if(lists.user.black.indexOf(domain) > -1){
      return false;
    }
    var systemwhite = isEmpty(lists.system.white) ? new Array() : lists.system.white;
    var robotwhite = isEmpty(lists.robot.white) ? new Array() : lists.robot.white;
    var userwhite = isEmpty(lists.user.white) ? new Array() : lists.user.white;
    var whitelists = systemwhite.concat(robotwhite,userwhite);
    if(whitelists === null){return false;}
    if(whitelists.indexOf(domain) > -1){
      return true;
    }
    return false;
  };
  //判断是否被墙
  var isBlock = function (domain) {
    if(lists === null || typeof(lists.system) == 'undefined' || typeof(lists.robot) == 'undefined' || typeof(lists.user) == 'undefined'){return false;}
    var systemwhite = isEmpty(lists.system.white) ? new Array() : lists.system.white;
    var robotwhite = lists.robot.white;
    var whitelists = systemwhite.concat(robotwhite);
    var systemblack = isEmpty(lists.system.black) ? new Array() : lists.system.black;
    var robotblack = lists.robot.black;
    var blacklists = systemblack.concat(robotblack);
    if(whitelists === null || blacklists === null){return false;}
    if(whitelists.indexOf(domain) > -1){
      return true;
    }else if(blacklists.indexOf(domain) > -1){
      return false;
    }else{
      return 'unknown';
    }
    return 'unknown';
  };
  //获取lists数量
  var getListsNumber = function(){
    var systemwhite = isEmpty(lists.system.white) ? new Array() : lists.system.white;
    var robotwhite = isEmpty(lists.robot.white) ? new Array() : lists.robot.white;
    var userwhite = isEmpty(lists.user.white) ? new Array() : lists.user.white;
    var whitelists = systemwhite.concat(robotwhite,userwhite);
    var number = isEmpty(whitelists) ? 0 : (Object.keys(whitelists).length - lists.user.black.length);
    return number;
  };
  //获取背景页数据
  var getData = function(callback,key,value){
    var types = Array('system','config','data','domain');
    if(types.indexOf(key) == -1){return false;}
    chrome.runtime.sendMessage({type:'get',key:key,value:value}, function(res) {
      if(!res){
        if(typeof(callback) == 'function'){
          callback(false);
        }
        return false;
      }
      if(key == 'system'){
        system = res.value;
      }else if(key == 'config'){
        config = res.value;
      }else if(key == 'data'){
        if(!res.value){return false;}
        config = res.value.config;
        system = res.value.system;
        lists = res.value.lists;
        proxy = res.value.proxy;
        url = res.value.url;
      }
      if(typeof(callback) == 'function'){
        callback(res.value);
      }
    });
  };
  //设置背景页数据
  var setData = function(callback,key,value){
    var types = Array('system','config','reload');
    if(types.indexOf(key) == -1){return false;}
    chrome.runtime.sendMessage({type:'set',key:key,value:value}, function(res) {
      if(typeof(callback) == 'function'){
        callback(res.value);
      }
    });
  };
  
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-97178398-1']);
    _gaq.push(['_trackPageview']);
    (function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    })();
  
    function trackEvent(category, action, label, opt) {
        _gaq.push(['_trackEvent', category, action, label, opt]);
    }
  
  //谷歌统计 Google Analytics
  var ga = function(level,a,b,c,d){
    if(debug){return false;}
    if(typeof(d) === 'undefined'){d = null;}else{d = parseInt(d);}
    if(typeof(c) === 'undefined'){c = null;}
    if(typeof(a) === 'undefined' || typeof(b) === 'undefined'){return false;}
    level = parseInt(level);
    if(level < 1 || level > 4){level = 4;}
    if(config !== null && typeof(config) !== 'undefined'){
      if(level == 1 && config.config.analytics.level1 != 1){return false;}
      if(level == 2 && config.config.analytics.level2 != 1){return false;}
      if(level == 3 && config.config.analytics.level3 != 1){return false;}
      if(level == 4 && config.config.analytics.level4 != 1){return false;}
    }
    
    if(c === null){
        _gaq.push(['_trackEvent', a, b]);
    }else if(c !== null && !d){
        _gaq.push(['_trackEvent', a, b, c]);
    }else if(c !== null && d){
        _gaq.push(['_trackEvent', a, b, c, d]);
    }
  };
  //打开页面
  var opentab = function(url,unique,selected,refresh,closeself){
    if(url == ''){return false;}
    if(typeof(unique) == 'undefined'){unique = true;}
    if(typeof(selected) == 'undefined'){selected = true;}
    if(typeof(refresh) == 'undefined'){refresh = true;}
    if(typeof(closeself) == 'undefined'){closeself = false;}
    //判断是否声明 tabs 权限
    var permissions = chrome.app.getDetails()['permissions'];
    var permis  = permissions.indexOf('tabs') > -1 ? true : false;
    if(permis && unique === true){
      chrome.tabs.getAllInWindow(null,function(tabs){
        for (var i=0;i<tabs.length;i++){
          if (tabs[i].url == url){
            if(refresh === true){
              chrome.tabs.update(tabs[i].id, {url:url,selected:true});
            }else{
              chrome.tabs.update(tabs[i].id, {selected:true});
            }
            if(closeself === true){window.close();}
            return true;
          }
        }
        chrome.tabs.create({url:url,selected:true});
      });
    }else{
      chrome.tabs.create({url:url,selected:selected});
      if(closeself === true){window.close();}
      return true;
    }
  };
  //根据网址获取域名
  var getDomainFromUrl = function (url) {
    var domain = null;
    if (typeof url == "undefined" || null == url) {
      return false;
    }
    url = url.toLowerCase();
    var regex = /[http|https]:\/\/([^\/]*).*/;
    var match = url.match(regex);
    var array1,array2;
    if (typeof(match) != "undefined" && null != match) {
      domain = match[1];
    }
    if(!domain){return false;}

    //排除内网地址
    var re=/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/g //匹配IP地址的正则表达式
    if(re.test(domain)){
      var ip1 = RegExp.$1;
      var ip2 = RegExp.$2;
      var ip3 = RegExp.$3;
      var ip4 = RegExp.$4;
      if(ip1 < 256 && ip2 < 256 && ip3 < 256 && ip4 < 256){
        if(ip1 == 10 || (ip1 == 172 && (ip2 > 16 || ip2 < 31)) || ip1 == 127 || (ip1 == 192 && ip2 == 168) || (ip1 == 169 && ip2 == 254)){return '';}
      }
    }
    if(domain == 'localhost'){return '';}

    //格式化一级域名
    domain = domain.split(':')[0];
    var exts = ".com.cn|.net.cn|.gov.cn|.org.cn|.com.il|.net.il|.org.il|.com.sa|.net.sa|.org.sa|.com.gr|.net.gr|.org.gr|.com.au|.net.au|.org.au|.com.in|.net.in|.org.in|.com.id|.net.id|.org.id|.com.tj|.net.tj|.org.tj|.com.ua|.net.ua|.org.ua|.com.uk|.net.uk|.com.br|.org.br|.net.br|.co.in|.co.id|.co.jp|.co.ls|.co.th|.co.uk|.co.za|.co.ke|.co.nz|.co.il|.co.uz|.co.ma|.co.ug|.co.zm|.co.hu|.co.kr|.co.im|.co.je|.co.cr|.co.ve|.co.vi|.co.ck|.com.ly|.net.ly|.org.ly|.com.vn|.net.vn|.org.vn|.com.na|.net.na|.org.na|.com.af|.net.af|.org.af|.com.bd|.net.bd|.org.bd|.com.gi|.net.gi|.org.gi|.com.my|.net.my|.org.my|.com.ec|.net.ec|.org.ec|.com.ni|.net.ni|.org.ni|.com.mt|.net.mt|.org.mt|.com.py|.net.py|.org.py|.com.pe|.net.pe|.org.pe|.com.uy|.net.uy|.org.uy|.com.ag|.net.ag|.org.ag|.com.cu|.net.cu|.org.cu|.com.do|.net.do|.org.do|.com.jm|.net.jm|.org.jm|.com.pr|.net.pr|.org.pr|.com.vc|.net.vc|.org.vc|.com.fj|.net.fj|.org.fj|.com.bo|.net.bo|.org.bo|.com.nf|.net.nf|.org.nf|.com.co|.org.co|.net.co|.com.sb|.net.sb|.org.sb|.com.bh|.net.bh|.org.bh|.com.om|.net.om|.org.om|.com.bz|.net.bz|.org.bz|.com.gt|.net.gt|.org.gt|.com.mx|.net.mx|.org.mx|.com.ar|.net.ar|.org.ar|.com.hk|.net.hk|.org.hk|.com.tr|.net.tr|.org.tr|.com.sg|.net.sg|.org.sg|.com.tw|.net.tw|.org.tw|.edu.tw|.gov.tw|.com.np|.net.np|.org.np|.com.pk|.net.pk|.org.pk|.com.ph|.net.ph|.org.ph|.com.eg|.net.eg|.org.eg|.com.et|.net.et|.org.et|.com|.net|.org|.edu|.gov|.int|.mil|.cn|.tel|.im|.biz|.cc|.tv|.info|.name|.hk|.mobi|.asia|.cd|.travel|.pro|.museum|.coop|.aero|.ad|.ae|.af|.ag|.ai|.al|.am|.an|.ao|.aq|.ar|.as|.at|.au|.aw|.az|.ba|.bb|.bd|.be|.bf|.bg|.bh|.bi|.bj|.bm|.bn|.bo|.br|.bs|.bt|.bv|.bw|.by|.bz|.ca|.cc|.cf|.cg|.ch|.ci|.ck|.cl|.cm|.cn|.co|.cq|.cr|.cu|.cv|.cx|.cy|.cz|.de|.dj|.dk|.dm|.do|.dz|.ec|.ee|.eg|.eh|.es|.et|.ev|.fi|.fj|.fk|.fm|.fo|.fr|.ga|.gb|.gd|.ge|.gf|.gh|.gi|.gl|.gm|.gn|.gp|.gr|.gt|.gu|.gw|.gy|.hk|.hm|.hn|.hr|.ht|.hu|.id|.ie|.il|.in|.io|.iq|.ir|.is|.it|.jm|.jo|.jp|.ke|.kg|.kh|.ki|.km|.kn|.kp|.kr|.kw|.ky|.kz|.la|.lb|.lc|.li|.lk|.lr|.ls|.lt|.lu|.lv|.ly|.ma|.mc|.md|.mg|.mh|.ml|.mm|.mn|.mo|.mp|.mq|.mr|.ms|.mt|.mv|.mw|.mx|.my|.mz|.na|.nc|.ne|.nf|.ng|.ni|.nl|.no|.np|.nr|.nt|.nu|.nz|.om|.qa|.pa|.pe|.pf|.pg|.ph|.pk|.pl|.pm|.pn|.pr|.pt|.pw|.py|.re|.ro|.ru|.rw|.sa|.sb|.sc|.sd|.se|.sg|.sh|.si|.sj|.sk|.sl|.sm|.sn|.so|.sr|.st|.su|.sy|.sz|.tc|.td|.tf|.tg|.th|.tj|.tk|.tm|.tn|.to|.tp|.tr|.tt|.tv|.tw|.tz|.ua|.ug|.uk|.us|.uy|.va|.vc|.ve|.vg|.vn|.vu|.wf|.ws|.ye|.yu|.za|.zm|.zr|.zw";
    array1 = exts.split('|');
    var len,temp;
    for(var i in array1){
      if(!array1[i]){continue;}
      len = array1[i].length;
      if(domain.substr(-len) == array1[i]){
        temp = domain.substr(0,domain.length-len);
        array2 = temp.split('.');
        domain = array2[array2.length-1] + array1[i];
        break;
      }
    }
    return domain;
  };
  //检测是否是ip地址
  var isIp = function(ip){
    var re=/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/g //匹配IP地址的正则表达式
    if(re.test(ip)){
      var ip1 = RegExp.$1;
      var ip2 = RegExp.$2;
      var ip3 = RegExp.$3;
      var ip4 = RegExp.$4;
      if(ip1 < 256 && ip2 < 256 && ip3 < 256 && ip4 < 256){
        return true;
      }
    }
    return false;
  };
  //根据域名获取首字母
  var getBegins = function (domain) {
    if (!domain) {
      return '';
    }
    if (domain.substr(0, 4) == 'www.') {
      return domain.substr(4, 1);
    } else {
      return domain.substr(0, 1);
    }
  };
  //根据网址获取协议
  var getScheme = function (url) {
    if (typeof(url) == "undefined" || null == url) {
      return false;
    }
    var array = url.split('://');
    if (array.length < 2) {
      return false;
    }
    return array[0];
  };
  //显示错误提示
  var showMsg = function(text,type){
    if(!!text){
      var top = document.documentElement.clientHeight/2 - 30;
      var left = document.documentElement.clientWidth/2 - 150;
      var classtext = type === false ? 'error' : 'success';
      text = text + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
      $('.mask').show();
      $('.msg').css({'top':top,'left':left}).addClass(classtext).html(text).show();
      onMask();
    }else{
      $('.mask').hide();
      $('.msg').html('').removeClass('success').removeClass('error').hide();
    }
  };
  var onMask = function(){
    if($('.mask').css("display") == 'none'){return false;};
    $('.mask,.msg').on('click',function(){
      $('.mask').hide();
      $('.msg').html('').hide();
    });
  }

  //时间格式化显示
  //timeStamp精确到毫秒，一般13位
  //format="yyyy-MM-dd hh:mm:ss";
  var timeFormat = function(timeStamp,format){
    var d = new Date(timeStamp);
    var o = {
      "M+" :d.getMonth() + 1, // month
      "d+" :d.getDate(), // day
      "h+" :d.getHours(), // hour
      "m+" :d.getMinutes(), // minute
      "s+" :d.getSeconds(), // second
      "q+" :Math.floor((d.getMonth() + 3) / 3), // quarter
      "S" :d.getMilliseconds()
    }
    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for ( var k in o) {
      if (new RegExp("(" + k + ")").test(format)) {
        format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
      }
    }
    return format;
  };
  //系统重置
  var reset = function(){
    //待优化：删除数据库，保存使用时间等
    //var second		= system('second');
    //window.localStorage.clear();
    cs('c');cs('s');cs('u');
  };
  //判断对象是否为空
  var isEmpty = function (obj) {
    if (typeof(obj) == 'undefined') {
      return true;
    } else if (typeof(obj) == 'object') {
      for (var name in obj) {
        return false;
      }
      return true;
    } else if (typeof(obj) == 'array') {
      for (var name in obj) {
        return false;
      }
      return true;
    } else if (typeof(obj) == 'string') {
      if (!obj) {
        return true;
      }
      return false;
    } else if (typeof(obj) == 'number') {
      if (!obj) {
        return true;
      }
      return false;
    }
  };
  //获取本地缓存getStorage
  var gs = function (key) {
    var result = null;
    if (typeof(window.localStorage['p__' + key]) !== "undefined") {
      result = JSON.parse(de(window.localStorage['p__' + key]));
    }
    return result;
  };
  //保存本地缓存setStorage
  var ss = function (key, val) {
    return window.localStorage['p__' + key] = en(JSON.stringify(val));
  };
  //清除本地缓存clearStorage
  var cs = function(key){
    window.localStorage.removeItem('p__' + key);
  };
  //输出调试记录
  var log = function (text) {
    debug && console.log(text);
  };
  //加密
  var en = function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = utf16to8(input);
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output = output + b64.charAt(enc1) + b64.charAt(enc2) + b64.charAt(enc3) + b64.charAt(enc4);
    }
    return output;
  };
  //解密
  var de = function (input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    if(typeof(input) !== 'undefined' && input !== null){
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      while (i < input.length) {
        enc1 = b64.indexOf(input.charAt(i++));
        enc2 = b64.indexOf(input.charAt(i++));
        enc3 = b64.indexOf(input.charAt(i++));
        enc4 = b64.indexOf(input.charAt(i++));
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 != 64) {
          output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
          output = output + String.fromCharCode(chr3);
        }
      }
      output = utf8to16(output);
    }
    return output;
  };
  var utf16to8 = function (str) {
    var out, i, len, c;
    out = "";
    str = str.toString();
    len = str.length;
    for (i = 0; i < len; i++) {
      c = str.charCodeAt(i);
      if ((c >= 0x0001) && (c <= 0x007F)) {
        out += str.charAt(i);
      } else if (c > 0x07FF) {
        out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
        out += String.fromCharCode(0x80 | ((c >> 6) & 0x3F));
        out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F));
      } else {
        out += String.fromCharCode(0xC0 | ((c >> 6) & 0x1F));
        out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F));
      }
    }
    return out;
  };
  var utf8to16 = function (str) {
    var out, i, len, c;
    var char2, char3;
    out = "";
    len = str.length;
    i = 0;
    while (i < len) {
      c = str.charCodeAt(i++);
      switch (c >> 4) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
          // 0xxxxxxx
          out += str.charAt(i - 1);
          break;
        case 12:
        case 13:
          // 110x xxxx 10xx xxxx
          char2 = str.charCodeAt(i++);
          out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
          break;
        case 14:
          // 1110 xxxx 10xx xxxx 10xx xxxx
          char2 = str.charCodeAt(i++);
          char3 = str.charCodeAt(i++);
          out += String.fromCharCode(((c & 0x0F) << 12) |
            ((char2 & 0x3F) << 6) |
            ((char3 & 0x3F) << 0));
          break;
      }
    }
    return out;
  };
};
