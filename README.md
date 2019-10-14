<h1 align="center">pp谷歌访问助手国庆版本</h1>本软件已破解，可永久免费使用！(即插件不更新可一直使用)

## 安装说明

由于新版本Chrome已禁止安装第三方应用，且本破解版无法上传至[Chrome网上应用店](https://chrome.google.com/webstore)，因此只能通过以下方法在开发者模式下运行：

1. 克隆本仓库到本地或下载[master.zip](https://github.com/haotian-wang/google-access-helper/archive/master.zip)后解压
2. 打开Chrome扩展程序管理器，或在网址栏输入 `chrome://extensions`
3. 勾选`开发者模式`
4. 点击`加载已解压的扩展程序`，选择本扩展所在目录

## 破解说明

- 已对插件入口manifest.json进行不必要代码删除。
- 之前版本监听了新标签页打开时替换为baidu首页，国庆版本额外增加了对淘宝等网站的监听，这里都进行了删除，js里面有部分用户信息上传的代码未进行处理

- 该插件通过代理服务器访问Google，代理服务器的地址和密码以及PAC脚本均由插件动态获取，服务端对可以访问的网站进行了限制，所以只能访问Google下的访问。可使用插件Proxy SwitchyOmega，将其中pac抓取出来，但是可能服务器会经常变动（或进行限制），所以不建议使用
- 经测试，其余第三方插件，比如穿越、无界等的pac脚本长期不变，可进行抓取使用Proxy SwitchyOmega进行管理