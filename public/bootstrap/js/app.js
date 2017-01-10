/*! Canvass E-Comm app.js
 * ================
 * Main JS application file for Canvass E-Comm v1. This file
 * should be included in all pages. It controls some layout
 * options and implements exclusive plugins.
 *
 * @Author  Naga Srinivas 
 * @version 1.0.0 
 */

'use strict';

(function(pubObj){
    
    //Make sure jQuery has been loaded before app.js
    if (typeof jQuery === "undefined") {
        throw new Error("this app requires jQuery");
    }
    /**
     * THis variable tells whther the current code is executing in Iframe mode or not
     */
    var AM_I_IFRAME = window.self !== window.top;
    var PAGE_URI = window.location.href;
    
    // ########################################    
    // Local(Private) Scope -- START
    // ########################################
    
    // $$$$$$$$$$ Local Socpe Variable -- START
    var debug = true;
    // $$$$$$$$$$ Local Socpe Variable -- END
    
    // this holds all the call baks waiting for account load object
    var accountLoadCallStack = [];
    
    
    pubObj.storeNotificationHandler={
        notificationStorageKey:"_cnv_notification_key_",
        NotificationsMap:{},
        invalidate:false,
        init:function(){
            var ME=this;
            ME.register();
        },
        register:function(){
            var ME=this;
            function storageEventHandler(evt){
                console.log("storage event called key: " + evt.key );
                switch(evt.key){
                    case "_cnv_notification_key_changed_":
                        ME.invalidate=true;
                        var data = localStorage.getItem(evt.key);
                        if(data != null && data != undefined){
                            data = data.substring(data.indexOf('_') + 1 )
                            C$.PersistenceManager.set(ME.notificationStorageKey,data);
                        }
                        break;
                }
            }
            window.addEventListener('storage', storageEventHandler, false);
        },
        loadNotificationDetails:function(_cb){
            var ME=this;
            var map=C$.PersistenceManager.get(ME.notificationStorageKey);    
            var optMap = localStorage.getItem('_cnv_notification_key_changed_');
            if(optMap!=null && optMap!=undefined){
                var ts = optMap.split('_')[0];
                var expectedTs = moment.unix(ts).add('50', 'seconds').unix();
                var currTs = moment().unix();
                if(currTs <= expectedTs){
                } else {
                    localStorage.removeItem('_cnv_notification_key_changed_');
                    console.log('notification key expired n removed');
                }
            }
            if(map!=null && map!=undefined){
                ME.NotificationsMap=eval("("+map+")");
                if(_cb!=undefined){
                    _cb();
                }
            }else{
                C$.get("/account/settings/xhr/notifications",{},function(data){
                    switch(data.status){                        
                        case 'SUCCESS':
                            for(var i=0;i<data.data.notifications.length;i++){
                                var notif = data.data.notifications[i];
                                if(notif.notificationType!=="AUTOMATION_RULE_EXECUTED" && notif.notificationType!=="ACCOUNT_CLOSED"){
                                    ME.NotificationsMap[notif.notificationType] = notif.emails; 
                                }
                            }
                            C$.PersistenceManager.set(ME.notificationStorageKey,JSON.stringify(ME.NotificationsMap));
                            if(_cb!=undefined){
                                _cb();
                            }
                            break;
                    }
                });
            }
        },
        getContact:function(key,_cb){
            var ME=this;
            if(Object.keys(ME.NotificationsMap).length === 0 || ME.invalidate){
                ME.invalidate=false;
                //load the notification emails first
                ME.loadNotificationDetails(function(){
                    if(_cb!=null && _cb!=undefined){
                        var email=ME.loadEmails(key);
                        if(email===""){
                            email=C$.AccountInfo.account.weeklySummaryRecipient;
                        }
                        _cb(email);
                    }
                });
            }else{
                if(_cb!=null && _cb!=undefined){
                    var email=ME.loadEmails(key);
                    if(email===""){
                        email=C$.AccountInfo.account.weeklySummaryRecipient;
                    }
                    _cb(email);
                }
            }
        },
        loadEmails:function(key){
            var ME=this;
            var email=null;
            $.each(ME.NotificationsMap,function(ind,val){
                if(ind===key){
                    email=val;   
                }
            });
            return email;
        },
        updateNotificationMap:function(key,val){
            var ME=this;
            ME.invalidate=true;
            ME.loadNotificationDetails(function(){
                C$.storeNotificationHandler.NotificationsMap[key]=val;
                C$.PersistenceManager.set(ME.notificationStorageKey,JSON.stringify(ME.NotificationsMap));
                /**
                 *@Rohit, set the localstorage, to update session in all d tabs
                 */
                var currTs = moment().unix();
                localStorage.setItem('_cnv_notification_key_changed_',currTs+"_"+JSON.stringify(ME.NotificationsMap));
            });
        }
    }
    pubObj.storeNotificationHandler.init();
    
    /**
     * THis Utill Object for doing the Commom Utility Functions
     */
    var MyUtil = {        
        createCookie : function(name,value,days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var expires = "; expires="+date.toGMTString();
            }
            else var expires = "";
            document.cookie = name+"="+value+expires+"; path=/";
        },
        readCookie : function(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
            }
            return null;
        },
        deleteCookie : function(name) {            
            this.createCookie(name,"",-1);            
        }
    }
    
    
    function Notifier(sticky,opts){
        this.sticky = sticky || false;
        this.opts = opts || {};
        this.$mainDiv = $('<div cnv_notifier class="'+(sticky===true?'sticky':'')+'"/>');
        this.$cntBody = $('<div />');
        this.init();
        this.attached = false;
        this.timer = null;
        this.delay = 4500;
        this.interactive = false;
        this._registeredCB = [];
    }
    Notifier.prototype = {
        init: function(){
            var ME = this;
            if(ME.sticky){
                ME.$mainDiv.prepend("<span class='close'><i class='fa fa-times-circle-o'/></span>");
            }
            ME.$mainDiv.append(ME.$cntBody);
            if(ME.sticky !== true){ // if not sticky then only registering the hover hide effect
                ME.$mainDiv.hover(function(evt){                
                    if(evt.type == 'mouseenter'){
                        if(ME.timer!=null){
                            window.clearTimeout(ME.timer);
                        }
                    }else if(evt.type == 'mouseleave'){
                        ME.hide();
                    }
                    // switching the flag
                    ME.interactive = false;
                });
            }
            ME.$mainDiv.on('click','.close',function(){
                ME.hide();
                if(ME.opts.onclose){
                    ME.opts.onclose();
                }            
            });
            ME.$mainDiv.on('click','[act-key]',function(){
                var $ele = $(this);
                if(ME._registeredCB && ME._registeredCB.length>0){
                    for(var i=0;i<ME._registeredCB.length;i++){
                        ME._registeredCB[i]($ele.attr('act-key') || $ele.text());
                    }
                }                
            });
        },
        makeInteractive:function(){
            this.interactive = true;
            return this;
        },
        on: function(_cb){
            var ME = this;
            this._registeredCB.push(_cb);
        },
        actions:function(acts){
            var ME = this;
            ME.$cntBody.append(" "+pubObj.Utill.generateButtons(acts,'btn-xs'));
            return this;
        },
        _setTimer: function(){
            var ME = this;
            if(ME.timer!=null){
                window.clearTimeout(ME.timer);
            }
            if(ME.delay > 0){
                ME.timer = window.setTimeout(function(){
                    ME.hide();
                }, ME.delay);
            }
        },        
        success: function(cnt,dly){
            return this.show(cnt,'success',dly);
        },
        loading: function(cnt,dly){
            return this.show(cnt,'loading',-1);
        },
        info: function(cnt,dly){
            return this.show(cnt,'info',dly);
        },
        danger: function(cnt,dly){            
            return this.show(cnt,'danger',dly);            
        },
        warning: function(cnt,dly){
            return this.show(cnt,'warning',dly);
            
        },
        show: function(cnt,type,dly){
            var ME = this;
            // first clearing the previous events list
            ME._registeredCB = [];
            dly = !dly?4000:dly;
            type = !type?'info':type;
            ME.$mainDiv.attr('state',type);
            
            ME.delay = dly;
            if(ME.attached != true){
                ME.attached = true;
                ME.$mainDiv.appendTo('body');
            }
            if(ME.sticky){
                $('body:first').addClass('sticknote-visible');
            }
            ME.$cntBody.empty().html(cnt);
            ME.$mainDiv.show().animate({
                top:'0'
            },400);
            ME._setTimer();
            return this;
        },
        hide: function(){
            var ME = this;
            ME.$mainDiv.animate({
                top:'-100px'
            },600,function(){
                ME.$mainDiv.hide();
            });
            if(ME.sticky){
                $('body:first').removeClass('sticknote-visible');
            }
        }
    };
    
    /**
     * This Class is used to directly upload the files to S3
     */
    function S3DirectUploader(bucketName, credentials, opts){
        this.bucketName = bucketName;
        this.credentials = credentials || null;
        this.opts = opts || null;
        this.initilized = this.credentials == null;
        this.timeout = false;
        this.fileProgressInPercent = 0;
        this.init();
    }
    S3DirectUploader.prototype = {
        init: function(){
            var ME = this;
            pubObj.get("/account/xhr/g_3s_c/"+ME.bucketName,{},function(data){                
                ME.credentials = data.data;
                ME.initialized = true;                
            });
            return this;
        },
        ready: function(_cb){
            this.afterLoad(_cb);
        },
        afterLoad:function(_cb){
            var ME = this;
            if(ME.initialized != true){
                window.setTimeout(function(){
                    ME.afterLoad(_cb);
                }, 250);
                return;
            }else{
                _cb.call(ME);
            }
        },
        upload: function(fileName,file,_cb) {
            var ME = this;            
            var fd = new FormData();
            var key = fileName;
            fd.append('key', key);
            fd.append('acl', 'public-read'); 
            fd.append('Content-Type', file.type);
            fd.append("AWSAccessKeyId",ME.credentials.si);
            fd.append('policy', ME.credentials.p);
            fd.append('signature',ME.credentials.sg);
            fd.append("file",file);
                    
            var xhr = new XMLHttpRequest();
            //xhr.upload.addEventListener("progress", uploadProgress, false);
            xhr.addEventListener("load", function(fileName,resourceId,evt){
                //console.log(fileName);
                //console.log(resourceId);
                //console.log(evt);
                }, false);
            //xhr.addEventListener("error", uploadFailed, false);
            //xhr.addEventListener("abort", uploadCanceled, false);
            xhr.onreadystatechange=function() {                
                if (xhr.readyState==4){
                    var _status = "SUCCESS";
                    if(xhr.status == 0){
                        _status = "TIME_OUT";
                    }
                    if(_cb){
                        _cb(ME.credentials.url+fileName, _status);
                    }
                }
            }
            xhr.upload.onprogress = function(e) {
                var percentComplete = Math.ceil((e.loaded / e.total) * 100);
                if(!isNaN(percentComplete)){
                    ME.fileProgressInPercent = percentComplete;
                    ME.onProgress(percentComplete);
                }
            };
            xhr.open('POST', ME.credentials.url, true); //MUST BE LAST LINE BEFORE YOU SEND            
            xhr.send(fd);
            
            //if timeout is set, then expire it aftr 3 tries with each 2seconds
            if(ME.timeout){
                var _lastCount = 0;
                var _lastProgress = ME.fileProgressInPercent;
                window.setInterval(function(){
                    if(ME.fileProgressInPercent >= 100){
                        clearInterval();
                        return;
        }
                    if(ME.fileProgressInPercent === _lastProgress && ME.fileProgressInPercent < 100){
                        if(++_lastCount == 3){
                            console.log("Upload is aborted");
                            xhr.abort();
                            clearInterval();
                            return;
    }
                    } else {
                        _lastCount = 0;
                    }
                    _lastProgress = ME.fileProgressInPercent;
                }, 2000);
            }
        },
        onProgress: function(percentComplete){
            console.log("uploaded: ",percentComplete+"%");
        }
    }
    
    function ScrollToTopHandler(){
        this.$btn = null;
        this.init();
    }
    ScrollToTopHandler.prototype = {
        init: function(){
            var ME = this;
            // not executing for Iframes
            if(!AM_I_IFRAME){
                ME.$btn = $('<span class="scroll-to-top-btn" />');
                ME.$btn.append('<i class="fa fa-chevron-up fa-lg"></i>');
                $(document).ready(function(){
                    $('body').append(ME.$btn);
                    ME.register();
                });
            }            
        },
        register: function(){
            var ME = this;
            //Check to see if the window is top if not then display button
            $(window).scroll(function(){
                if ($(this).scrollTop() > 100) {
                    ME.$btn.addClass('active');
                } else {
                    ME.$btn.removeClass('active');
                }
            });
            //Click event to scroll to top
            ME.$btn.click(function(){
                $('html, body').animate({
                    scrollTop : 0
                },800);
                return false;
            });
        }
    }
    pubObj.scrollToTopHandler = new ScrollToTopHandler();
    
    /**
     *@Rohit, scrollTo function 
     */
    $.fn.extend({
        scrollToMe: function () {
            var x = jQuery(this).offset().top - 100;
            $('html,body').animate({
                scrollTop: x
            }, 500);
        }
    });
    
    /**
     * This is the main object which holds the account information of the currently logged in user
     */
    var AccountHandler = {
        loaded: false,
        accountData:null,        
        init:function(_cb){
            var ME = this;
            var isDataInvalid = MyUtil.readCookie("_cnv_account_data") || '';
            var _acData = localStorage.getItem('_cnv_account_data');
            if(isDataInvalid != 'invalid' && _acData!=undefined && _acData!=''){
                ME.accountData = eval("("+_acData+")");
                pubObj.AccountInfo = ME.accountData;
                ME.loaded = true;
            }            
            function _notifyAccountLoad(){
                // Now calling the all the callbacks
                for(var i=0;i<accountLoadCallStack.length;i++){
                    if($.isFunction(accountLoadCallStack[i])){
                        accountLoadCallStack[i].call(pubObj.AccountInfo);                        
                    }
                }
                // clearing the callstack
                accountLoadCallStack = [];
            }
            if(isDataInvalid == 'invalid' || !ME.loaded){
                pubObj.AccountInfo = undefined;
                // deleting the dmarc cookie just before loaidng the latest account details
                MyUtil.deleteCookie("_cnv_dmarc_ckie");
                $.get("/account/xhr/account_details",{},function(data){
                    data = eval("("+data+")");
                    switch(data.status){
                        case 'SUCCESS':
                            ME.accountData = data.data;
                            pubObj.AccountInfo = ME.accountData;
                            log("Account Data is Loaded from server");
                            //log(ME.accountData);
                            ME.loaded = true;
                            localStorage.setItem('_cnv_account_data',JSON.stringify(ME.accountData));
                            MyUtil.deleteCookie("_cnv_account_data");
                            _notifyAccountLoad();                                                        
                            break;
                    }
                    //console.log(ME.accountData);
                    if(_cb){
                        _cb();
                    }
                });
            }else{
                log("Taking the local version");
                if(_cb){
                    _cb();
                }
                _notifyAccountLoad();
            }
        }
    };
    
    
    /**
     * User Permissions Handler Class
     */
    var _UserPermissionsHandler = {
        permissions:{
            contacts:{
                'add_upload_contacts':true
            }
        },
        isAllowed: function(val){
            var perm = AccountHandler.accountData.permissions;
            var ME = this;
            val = !val?"":val;
            var vals = val.split(".");            
            var flag = true;
            if(perm[vals[0]]!=undefined && perm[vals[0]][vals[1]]!=undefined){ 
                flag = perm[vals[0]][vals[1]] != false;
            }
            
            return flag;
        },
        init: function(){
            this.reValidate();
        },
        reValidate: function(div){
            var ME = this;
            if(!AccountHandler.loaded){
                window.setTimeout(function(){
                    ME.reValidate(div);
                }, 100);
                return;
            }            
            if(div == undefined || div == null){
                div = $('body');
            }
            $(div).find('[user-role]').each(function(){
                var $ele = $(this);
                var action = $ele.attr('user-role');
                if(!ME.isAllowed(action)){
                    $ele.addClass('disabled');                    
                    $ele.addClass('user-access-blocked');                    
                    switch($ele.prop('tagName')){
                        case 'A':
                            $ele.removeAttr('href');
                            break;                            
                    }
                    $ele.attr('title','Sorry! Your account does not have access to this');
                }        
            });
        }
    }
    
    
    var _HANDLERS = {
        PAGE_LOAD: function(opt){
            if(opt.sidebar != undefined && opt.sidebar == 'collapse'){
                $('body').addClass('sidebar-collapse');
            }
            var $sideMenu = $('#_app_side_menu');
            var $li = $sideMenu.find('[menu-key="'+opt.menu+'"]');            
            if($li != undefined){
                $li.parents('.treeview').addClass('active'); // activating the parent first
                $li.addClass('active'); // activating the targeted child            
            }
            AccountHandler.init(function(){
                pubObj.TopActionsHeader.init();
                pubObj.TopActionsHeader.ready(function(){                    
                    pubObj.TopActionsHeader.renderBreadcrumb($li);
                });                
                _UserPermissionsHandler.init();            
            }); // initializing  the account data            
        }
    };    
    
    // custom method
    var AjaxUtil = {
        handleResponse: function(_data,opt){            
            switch(_data.status){
                case 'SUCCESS':
                    break;
                case 'FAIL':
                    break;
                case 'EXCEPTION':
                    break;
                case 'SESSION_INVALID':
                    // handling for the iframes
                    if(window === window.parent){
                        window.location.href = "/login/user";
                    }else{
                        window.parent.location.href = "/login/user";
                    }                    
                    break;
            }
            if(opt){
                if($.isFunction(opt)){
                    opt(_data);
                }else{
                    if(opt.callback){
                        opt.callback(_data);
                    }
                    if(_data.status=='SUCCESS' && opt.success){
                        opt.success(_data.data);
                    }
                    if(_data.status=='FAIL' &&opt.fail){
                        opt.fail(_data.ERROR_CODE);
                    }
                }
            }
        }
    };
    
    
    /**
     * Iframe Popup
     */
    function IFramePopup(){
        this.$mainDiv;
        this.$backDrop;
        this.$topBar;
        this.$closeEle;
        this.$frame;
        this.$switchMode;
        this.uri;
        this.$topTitle;
        this.$topBackBtn;
        this.init();
    }
    IFramePopup.prototype = {
        init: function(uri){
            var ME = this;
            ME.uri = uri;
            ME.$topBackBtn = $("<span action='close' class='btn btn-flat btn-success pull-right'>Go Back</span>");
            ME.$topTitle = $("<span class='frame-title'>Hello</span>");
            ME.$topBar = $("<section class='top-bar'></section>");            
            ME.$topBar.append(ME.$topTitle).append(ME.$topBackBtn);
            //            ME.$closeEle = $("<span action='close' class='close'>x</span>");
            ME.$closeEle = $('<span class="close" action="close"></span>');
            ME.$backDrop = $("<div class='iframe_poup_backdrop' />");
            ME.$mainDiv = $("<div class='iframe_poup' />");
            ME.$frame = $('<iframe frameborder="0" />');
            
            ME.$mainDiv.append(ME.$topBar);
            ME.$mainDiv.append(ME.$closeEle);
            ME.$mainDiv.append(ME.$frame);
            ME.$mainDiv.animate({
                'opacity':'0'
            });
            ME.$mainDiv.on('click','[action]',function(){
                var action = $(this).attr('action');
                switch(action){
                    case 'close':
                        ME.close(); 
                        break;
                }
            });            
            ME.$frame.load(function(){
                ME.$mainDiv.removeClass('cnv_loading');                
            });
        },
        open:function(uri,opts){
            var ME = this;
            opts = !opts?{}:opts;
            opts = $.extend({},{
                'custom_class':'',
                // @Ritesh commented close text to not show x with close button image 
                //                'close_text':'x',
                'title_text':''
            },opts);            
            uri = !uri?this.uri:uri;
            this.uri = uri;
            ME.$mainDiv.removeClass('full');            
            ME.$frame.attr('src',uri);            
            ME.$topTitle.html(opts.title_text);
            ME.$backDrop.appendTo('body');
            ME.$mainDiv.appendTo('body');
            ME.$mainDiv.addClass(opts.custom_class);
            ME.$mainDiv.addClass('cnv_loading');
            ME.$closeEle.html(opts.close_text);
            ME.$backDrop.show();
            ME.$mainDiv.show();
            ME.$frame.css('visibility','hidden');
            //check for height n width present in opts, if yes, apply
            if(opts && ((opts.width || opts.height) || opts.autoSize)){
                //                alert(opts.autoSize);
                var _height = opts.height;
                var _width = opts.width;
                if(opts.autoSize){
                    _width = "600px";
                    _height = "312px";
                }
                ME.$mainDiv.css('width', _width);
                ME.$mainDiv.css('height', _height);
                ME.$mainDiv.css('left', '30%');
            } else {
                ME.$mainDiv.css('height', '');
                ME.$mainDiv.css('width', '');
                ME.$mainDiv.css('left', '');
            }
            $('body').addClass('modal-open');
            ME.$mainDiv.animate({
                'opacity':'1'
            },500,function(){
                ME.$frame.css('visibility','visible');
            });            
        },
        openInFullMode: function(uri,titleText){
            var ME = this;
            titleText = !titleText?'':titleText;
            ME.open(uri,{
                'custom_class':'full',
                'title_text':titleText
            });
        },
        close:function(){
            var ME = this;
            $('body').removeClass('modal-open');
            ME.$frame.css('visibility','hidden');
            ME.$mainDiv.animate({
                'opacity':'0'
            },250,function(){
                ME.$mainDiv.hide();
                ME.$backDrop.hide();                
            });            
        }
    }
    
    /**
     * This class will do all the util operations
     */
    function Utils(){        
    }
    Utils.prototype = {
        resetForm: function(form){
            var $form = $(form);
            if($form[0]){
                $form[0].reset();
                var validator = $form.data().validator;
                if(validator){
                    validator.resetForm();
                    // removing all the errors
                    $form.find('.has-error').removeClass('has-error');
                }
            }
        },
        _parseBtnString:function(val){
            var obj = {};
            var _v = val.split(":");
            obj['html'] = $.trim(_v[0]);
            obj['type'] = _v[1] || "";
            obj['key'] = _v[2] || "";
            return obj;
        },
        generateButtons: function(actions,cls){
            var ME = this;
            cls = cls || '';
            var _cnt = "";            
            for(var i=0;i<actions.length;i++){
                var action = actions[i];
                var _btn = action;
                if(typeof _btn === 'string'){
                    _btn = ME._parseBtnString(action);
                }
                _btn = $.extend({}, {
                    text:'',
                    type:'',
                    key:''
                },_btn);
                var text = _btn.html;
                var btnType = _btn.type;                
                //_cnt += ("<a href='javascript:;' act-key='"+_btn.key+"' class='btn btn-flat "+ME.parseButtnStyle(btnType)+"' data-action='"+text.replaceAll(" ","").toLowerCase()+"'>"+text+"</a>");
                _cnt += ("<a href='javascript:;' act-key='"+_btn.key+"' class='"+cls+" btn btn-flat "+ME.parseButtnStyle(btnType)+"'");
                if(_btn.attr){
                    $.each(_btn.attr,function(k,v){
                        _cnt += (" "+k+"='"+v+"'");
                    });
                }
                _cnt += (">"+text+"</a>");                
            }            
            return _cnt;
        },
        parseButtnStyle: function(btnType){
            var btnClass = 'btn-default';
            switch(btnType){
                case 'p':
                    btnClass = 'btn-primary';
                    break;
                case 'w':
                    btnClass = 'btn-warning';
                    break;
                case 'i':
                    btnClass = 'btn-info';
                    break;
                case 'd':
                    btnClass = 'btn-danger';
                    break;
                case 's':
                    btnClass = 'btn-success';
                    break;
            }
            return btnClass;
        },
        isValidEmailSender:function(email){
            return email && !(email.indexOf("@gmail") !== -1 // Gmail
                || email.indexOf("@googlemail") !== -1 // Gmail
                || email.indexOf("@yahoo") !== -1 // Yahoo
                || email.indexOf("@ymail") !== -1 // Yahoo
                || email.indexOf("@yahoomail") !== -1 // Yahoo
                || email.indexOf("@rocketmail") !== -1 // Yahoo
                || email.indexOf("@aol") !== -1); // AOL
        },
        extractMailDomain:function(email){            
            email = email.toLowerCase();
            var domain = email.split("@")[1] || '';
            domain = domain.split(".")[0];
            return domain;
        }
    }
    
    function getAnimatedIconHtmlForBtn(){
        return '<i class="fa fa-refresh fa-spin" style="margin-right:5px"></i>';
    }
    
    function log(msg){
        if(debug){
            console.log(msg);
        }
    }
    
    /**
     * JaQUery related
     */
    var _JQ = function(ele){
        this.$ele = ele;
    }
    _JQ.prototype = {
        validate: function(opts){
            var ME = this;            
            var validOpts = $.extend(true,{},{
                highlight: function(element) {                    
                    if($(element).closest('.form-group')[0] == undefined){
                    //$(element).closest('.control-group').addClass('has-error');
                    }else{
                        $(element).closest('.form-group').addClass('has-error');
                    }
                },
                unhighlight: function(element) {
                    if($(element).closest('.form-group')[0] == undefined){
                    //$(element).closest('.control-group').removeClass('has-error');
                    }else{
                        $(element).closest('.form-group').removeClass('has-error');
                    }
                }
            },opts);            
            return $(ME.$ele).validate(validOpts);            
        },
        /**
         * This method will give the focus effect to the given dialog element
         * @Note it should be used with only the dialogs
         */
        focusDialog: function(delay,distance,_cb){
            var ME = this;
            delay = delay || 80;
            distance = distance || 15;
            ME.$ele.animate({
                left:'+='+distance
            },delay,function(){
                ME.$ele.animate({
                    left:'-='+(2*distance)
                },delay/2,function(){
                    ME.$ele.animate({
                        left:'+='+distance
                    },delay,function(){
                        if(_cb){
                            _cb();
                        }
                    });
                });
            });
            return this;
        }
    }
    
    // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    // Custom JQuery Validation Methods
    // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$    
    
    jQuery.validator.addMethod("complete_url", function(val, elem) {
        // if no url, don't do anything
        if (val.length == 0) {
            return true;
        }
        // if user has not entered http:// https:// or ftp:// assume they mean http://
        if(!/^(https?|ftp):\/\//i.test(val)) {
            val = 'http://'+val; // set both the value
            $(elem).val(val); // also update the form element
        }
        // now check if valid url
        return /^((https?|ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(val);
    },"Please enter valid url.");
    
    jQuery.validator.addMethod("valid_email_sender", function(val, element) {        
        val = val || '';
        val = val.toLowerCase();
        return pubObj.Utill.isValidEmailSender(val);
    }, function(flag,ele){
        var val = $(ele).val() || '';
        var domain = pubObj.Utill.extractMailDomain(val);        
        var msg = "";
        switch(domain){
            case 'gmail':
            case 'googlemail':
                msg += "A Gmail ";
                break;
            case 'yahoo':
            case 'ymail':
            case 'yahoomail':
            case 'rocketmail':
                msg += "A Yahoo ";
                break;
            case 'aol':
                msg += "An AOL ";
                break;
        }
        msg += "'From' address may prevent the delivery of your emails."
        +" Please use a corporate email address (name@yourdomain.com)."
        +" <a href='#' onmouseover='$(this).focus();' onclick='window.cnv_developer.showDMARCDialog(this);return false;'>Learn why</a>"
        +"<br/><a href='#' onmouseover='$(this).focus();' style='margin-top:8px;' class='btn btn-flat btn-default btn-sm' onclick='window.cnv_developer.ackDMARCRisk(this);return false;'>Acknowledge The Risk</a>";
        return msg;
    });        
    
    /**
     * THis classs for inline remove options
     */
    function InlineConfirm(){
        this.$ele=null;
        this.$originalEle = null;
        this.$blk = null;
        this.$container = null;
        this.init();
        this.tempCB = null;
    }
    InlineConfirm.prototype = {
        init:function(){
            var ME = this;
            ME.$container = $("<div style='position:absolute;opacity:1;background:#eee;border:1px solid white;' il-div/>");
            ME.$blk = $("<div />");
            ME.$blk.append("<button class='btn btn-flat btn-sm btn-default' btn-act='CANCEL'><i class='fa fa-close'></i></button>&nbsp;<button class='btn btn-flat btn-sm btn-danger' btn-act='CONFIRM'><i class='fa fa-check'></i></button><div style='clear:both;'></div>");
            ME.$container.append(ME.$blk);
            //ME.$container.appendTo('body');
            this._register();
        },
        _register:function(){
            var ME = this;
            ME.$blk.on('click','[btn-act]',function(evt){
                evt.preventDefault();
                evt.stopPropagation();
                ME._detach();
                var act = $(this).attr('btn-act');
                var confirmed = false;
                if(act == 'CONFIRM'){
                    confirmed = true;
                }
                if(ME.tempCB != null){
                    ME.tempCB(confirmed);
                }
            });
            ME.$blk.on('mouseleave',function(){
                ME._detach();
            });
        },
        show:function(ele,_cb) {
            var ME = this;
            ME.tempCB = _cb;
            ME._detach();
            //alert("Hi");
            ME.$ele = $(ele);
            ME.$container.insertAfter(ME.$ele);
            //ME.$ele.position($(ele));
            //ME.$container.appendTo($(ele).parent());
            //ME.$container.appendTo($(ele).parent());
            //ME.$container.append(ME.$ele);
            //var pos = $(ele).offset();
            var pos = $(ele).position();
            //console.log(pos);
            ME.$container.css({
                top:pos.top-13,
                left:pos.left-34           
            });
            //console.log(ME.$container.position());
            //console.log($(ele).position());
            ME._attach();
        },
        _attach:function(){
            var ME = this;            
            //console.log(ME.$ele);
            //ME.$ele.wrap(ME.$container);            
            //ME.$blk.insertAfter(ME.$ele);
            ME.$container.show();
        },
        _detach:function(){
            var ME = this;
            if(ME.$ele != null){                
                //ME.$ele.remove();
                ME.$ele = null;
                ME.$container.appendTo('body');
            //ME.$container.hide();                
            }
        }
    }    
    
    
    
    /**
     * This Class is used to create sublists
     */
    function SublistCreator(){
        this.initilized = false;
        this.$modalDiv = null;
        this.$form = null;
        this.callback;
        this.init();
    }
    SublistCreator.prototype = {
        init: function(){
            var ME = this;
            ME.initializeTemplate();
            ME.register();
        },
        register: function(){
            var ME = this;
            ME.$modalDiv.on('shown.bs.modal', function () {
                $(this).find('input:text:visible:first').focus();
            });

            pubObj.jq(ME.$form).validate({
                submitHandler: function(form){
                    var listName = ME.$form.find("input[name='listName']").val();
                    listName = listName.trim();
                    ME.$form.find('[for="listName"].error').remove();
                    C$.get('/account/contacts/xhr/create_list',{
                        listName: listName,
                        listType: "LIST"
                    }, {
                        button: ME.$form.find('[type="submit"]', form),
                        callback: function(data){
                            switch(data.status){
                                case "SUCCESS":
                                    ME.$modalDiv.modal('hide');
                                    var resObj= eval("(" + data.json + ")");
                                    ME.onCreate(resObj);
                                    break;
                                case "FAIL":
                                    var resObj= eval("(" + data.json + ")");
                                    switch(resObj.ERROR){
                                        case 'LIST_ALREADY_EXISTS':
                                            var cnt = '<label for="listName" class="error">List name already exists</label>';
                                            $("input[name='listName']").after(cnt);
                                            $("input[name='listName']").parent('.form-group').addClass('has-error');
                                            break;
                                    }
                                    break;
                            }
                        }
                    });
                    return false;
                }
            });
        },
        initializeTemplate: function(){
            var ME = this;
            ME.$modalDiv = $('<div class="modal fade" create-list-modal tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="display: none;"  data-keyboard="false" data-backdrop="static" />');
            var cnt = '<div class="modal-dialog"> <div class="modal-content"> <form id="createSublistForm"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-hidden="true"><span aria-hidden="true">&times;</span></button> <h4 class="modal-title">Create a sublist</h4> </div> <div class="modal-body"> <div class="row"> <div class="col-md-12"> <div class="col-md-8 col-md-offset-2"> <div class="form-group"> <label for="listName">List name</label> <input type="text" class="form-control" required="required" name="listName" placeholder="Enter list name"> </div> </div> </div> </div> </div> <div class="modal-footer"> <button class="btn btn-flat btn-default" type="button" data-dismiss="modal">Cancel</button> <button type="submit" class="btn create-sublist-btn btn-flat btn-success" data-loading-text="Creating...">Create</button> </div> </form> </div> </div>';
            ME.$modalDiv.append(cnt);
            ME.$form = ME.$modalDiv.find('form');    
        },
        setTemplate: function(){
            var ME = this;
            if(!ME.initilized){
                $('body').append(ME.$modalDiv);
                ME.initilized = true;
            }
        },
        show: function(_cb){
            var ME = this;
            ME.setTemplate();
            $(ME.$form)[0].reset();
            ME.callback = _cb;
            ME.$modalDiv.modal('show');
        },
        onCreate: function(listObj){
            var ME = this;
            if(ME.callback){
                ME.callback(listObj);
            } else {
                pubObj.notifier.danger('Provide a proper callback to sublist creator');
            }
        }
    }    
    
    
    /**
     * This class holds all the templates in the app
     */
    function TemplateResource(url){
        //this.name = name || "Template Engine";
        this.url = url;
        this.$container = null;
        this.initialized = false;
        this._waitingStack = [];
        this.init();
    }
    TemplateResource.prototype = {
        init:function(){
            var ME = this;            
            ME.$container = $("<div />");
            ME.$container.load(ME.url,function(){
                pubObj.scanContainer(ME.$container);
                ME.initialized = true;
                ME._initialized();
            });                
            
        },
        _initialized:function(){
            var ME = this;            
            // if there is a waiting stack then calling all the methods
            if(ME._waitingStack.length > 0){
                for(var i=0;i<ME._waitingStack.length;i++){
                    // calling all the callbacks                    
                    ME._waitingStack[i].call(ME);
                }                
                // finally clearing the waiting stack
                ME._waitingStack = [];
            }
        },
        ready:function(_cb){
            var ME = this;            
            if(ME.initialized !== true){
                ME._waitingStack.push(_cb);
            }else{
                if(_cb){
                    _cb.call(ME);
                }
            }            
        },
        getTemplate:function(name){
            var ME = this;
            return ME.$container.find('[cnv-tmpl="'+name+'"]').clone();  
        }
        
    }
    
    var TemplateEngine = {
        Type:{
            DESIGNERS:"/templates/_designer-templates.html?v=1.0.4",
            DASHBOARD:"/templates/_dashboard.html?v=1.0.2"
        },
        _templateMap: {},
        /**
         * This method loads the all the temaltes related to the designers
         */
        loadDesigners:function(name,_cb){
            this.load('DESIGNERS',name,_cb);
        },
        /**
         * This method loads the specified template from the given type
         * @param type the type of the Template (DESIGNERS,DASHBOARD etc...)
         * @param name name of the template
         * @param _cb callback
         */
        load:function(type,name,_cb){
            var ME = this;
            if(ME._templateMap[type] === undefined){
                ME._templateMap[type] = new TemplateResource(pubObj.RESOURCE_URL+ME.Type[type]);
            }
            ME._templateMap[type].ready(function(){
                var tmpl = this.getTemplate(name);                
                if(_cb){
                    _cb(tmpl);
                }
            });
        }
    }
    
    /**
     * This is the abstract class for the Configuration
     */
    function Configuration(){        
    }
    Configuration.prototype = {
        getLandingPageDefaultDomains: function(){
            var defaultDomains=[];
            //defaultDomains.push("localhost:8084");
            defaultDomains.push("app.firecart.io");
            defaultDomains.push("dashboard.canvass.in");
            //defaultDomains.push("app.firecart.io");
            return defaultDomains;
        }
    }    
    
    // ########################################    
    // Local(Private) Scope -- END
    // ########################################
    
    
    
    // ########################################    
    // Global(Public) Scope -- START
    // ########################################
    
    pubObj.notifier = new Notifier();
    pubObj.stickyNote = new Notifier(true,{
        onclose:function(){
            // setting the cookie
            MyUtil.createCookie("_cnv_dmarc_ckie","true",1);
        }
    });
    pubObj.FramePopup = new IFramePopup();
    pubObj.MyUtil = MyUtil;
    pubObj.Utill = new Utils();
    pubObj.jq = function(ele){
        return new _JQ(ele);
    };
    pubObj.subListCreator = new SublistCreator();
    pubObj.inlineConfirm = new InlineConfirm();
    pubObj.appConfiguration = new Configuration();
    
    pubObj.get = function(url,req,opt){
        if(opt.button)
            pubObj.button(opt.button, 'loading');
        var _st = new Date().getTime();
        $.get(url,req,function(_data){
            var _et = new Date().getTime() - _st;
            log(url+" took: "+_et+ " milliseconds");
            if(opt.button)
                pubObj.button(opt.button, 'reset');
            _data = eval("("+_data+")");
            AjaxUtil.handleResponse(_data,opt);
        });        
    }
    
    pubObj.post = function(url,req,opt){        
        $.post(url,req,function(_data){
            _data = eval("("+_data+")");
            AjaxUtil.handleResponse(_data,opt);
        });
    }    
    // initializing the template loader
    pubObj.TemplateLoader = TemplateEngine;
    
    /**
     *
     */
    pubObj.showDMARCDialog = function(){        
        var msg = "<h4 style='font-weight:600'>DMARC</h4>"
        +"<p>Every email domain has policies that help decide whether incoming messages should be accepted or rejected. DMARC is one of these policies. It stands for Domain-based Message Authentication, Reporting, and Conformance, and takes effect if an email fails certain types of authentication.</p>"
        +"<p>DMARC policies benefit the email community as a whole because they help prevent phishing, spoofing, and the delivery of fraudulent emails. However, strict DMARC policies can sometimes misidentify your legitimate marketing emails as fraudulent and reject them.</p>"
        +"<h4 style='font-weight:600'>What is the issue?</h4>"
        +"<p>Some free email providers, like Yahoo and AOL Mail & Gmail, have adopted strict DMARC policies to prevent spam and spoofing. When you choose a From email address provided by a free email service, their DMARC policy may tell receiving servers to reject your campaign because it wasn't sent through them.</p>"
        +"<p>For example, let's say you send a email activitiy with a From email address like firstname.lastname@yahoo.com. The campaign appears to be sent from a yahoo.com domain, but it's actually sent from our SMTP servers. Yahoo's strict DMARC policy doesn't like this. Their DMARC policy tells your subscribers' receiving servers to automatically reject anything that looks like it comes from yahoo.com, but comes from somewhere else instead.</p>"
        +"<h4 style='font-weight:600'>What should be done?</h4>"
        +"<p>To improve deliverability, we encourage you to use a From email address at a domain owned by you or your organization, like firstname.lastname@mycompany.com. Not only will this help avoid delivery issues, it can help your subscribers recognize your brand.</p>"
        bootbox.alert({
            title: "About DMARC",
            message: msg
        });
    };
    pubObj.ackDMARCRisk = function(trg){
        var $fg = $(trg).closest('.form-group');        
        if($fg[0]){
            var $ele = $fg.find('.valid_email_sender');
            var domain = pubObj.Utill.extractMailDomain($ele.val());
            switch(domain){
                case 'gmail':
                case 'googlemail':
                    domain = 'Gmail';
                    break;
                case 'yahoo':
                case 'ymail':
                case 'yahoomail':
                case 'rocketmail':
                    domain = 'Yahoo';
                    break;
                case 'aol':
                    domain = 'AOL';
                    break;
            }            
            var msg = "<div class='alert alert-warning'>"
            +"<h4><i class='icon fa fa-info-circle'></i> Deliverability warning</h4>"
            +"Subscribers with "+domain+" addresses might not receive Firecart activity emails with "+(domain=='AOL'?'an':'a')+' '+domain+" From email address. This is because several free email providers have changed their authentication policies."
            +"</div>"
            +"<p>Yahoo and AOL already have these policies in place. Gmail, Hotmail, and others are set to implement them soon.</p>"
            +"<p>To avoid the risk of delivery issues, use a From email address at your own custom domain.</p>"
            +"<p>Don't have a custom domain? Register one with <a href='http://domains.google.com/' target='_blank'>Google Domains</a>.</p>";
            bootbox.confirm({
                title: "Confirm",
                message: msg,
                buttons: {
                    'cancel': {
                        label: 'Cancel'                        
                    },
                    'confirm': {
                        label: "I'll Take The Risk"
                    }
                },
                callback: function(result){
                    if(result){
                        $ele.removeClass('valid_email_sender');
                        var $form = $fg.closest('form');
                        $form.validate().element($ele);                        
                    }
                }
            });
        }
    }
    
    /**
     * This object is used for all the data persisten work
     * which will save in the currrent session storage
     */
    pubObj.PersistenceManager = {
        supported : window.sessionStorage!=undefined,
        set: function(key,data){
            return this.save(key,data);
        },
        save:function(key,data){
            var flag = false;
            try{
                if(!this.supported){
                    return false;
                }
                data = JSON.stringify(data);                
                sessionStorage.setItem(key,data);
                flag = true;
            }catch(e){}
            return flag;
        },
        remove:function(key){
            var flag = false;
            try{
                if(!this.supported){
                    return false;
                }
                sessionStorage.removeItem(key);
                flag = true;
            }catch(e){}
            return flag;
        },
        get:function(key){
            return this.load(key);  
        },
        load:function(key){
            //return null; /** for testing disabled the local cache**/
            var data = null;
            if(!this.supported){
                return false;
            }
            try{                
                data = sessionStorage.getItem(key);
                data = eval("("+data+")");                
            }catch(e){}
            return data;
        }
    }
    
    /**
     *@Rohit add hotjar script only for new users
     */
    pubObj.HJ = {
        _storageKey: "HOTJAR-INITIALIZED",
        isInitialized: false,
        init: function() {
            var ME = this;
            if(!ME.isInitialized){
                ME.isInitialized = true;
                ME._addScript();
            }
        },
        _internalInit: function(){
            var ME = this;
            if(!ME.isInitialized){
                var PM = pubObj.PersistenceManager; 
                var _val = PM.get(ME._storageKey);
                if(_val && _val == "true"){
                    ME.isInitialized = true;
                    ME._addScript();
                }
            }
        },
        _addScript: function(){
            var ME = this;
            var PM = pubObj.PersistenceManager;
            PM.set(ME._storageKey, "true");
            /**
             *Enable following code only on Main Account
             */
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){
                    (h.hj.q=h.hj.q||[]).push(arguments)
                };
                h._hjSettings={
                    hjid:122881,
                    hjsv:5
                };
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');
                r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'//static.hotjar.com/c/hotjar-','.js?sv=');
        }
    }
    pubObj.HJ._internalInit();
    
    /**
     * Public method to create the direct uploader object
     */    
    pubObj.createDirectUploader = function(bucketName){
        var KEY = "_cnv_s3_bucket_info_";
        var PM = pubObj.PersistenceManager;
        var s3Credentials = PM.load(KEY+bucketName);
        var s3Uploader;
        // if the details are not found then load from the Server
        if(s3Credentials == null){
            s3Uploader = new S3DirectUploader(bucketName);
            PM.save(KEY+bucketName,s3Uploader.credentials);
        }else{
            log("Loaded the S3 Bucket Details from local cache");
            s3Uploader = new S3DirectUploader(bucketName,s3Credentials);            
        }
        return s3Uploader;
    }
    
    /**
     * This class handles the flow between the workflow and other campaign activities of the system
     */    
    pubObj.WorkFlowBridge = {
        storagePrefix : '_cnv_wf_bridge_data_',
        _getKey: function(key){
            return this.storagePrefix+key;
        },
        /**
             * @Rohit This method gives the workflowId by campaign id
             */
        getWorkflowIdByActivityId: function(activityId){
            var ME = this;
            var PM = pubObj.PersistenceManager;
            var info = PM.get(ME._getKey(activityId));            
            if(info){
                return info.wf.id;
            }
            return -1;
        },
        setWorkflowIdByActivityId: function(actId, wfId){
            var ME = this;
            wfId = ""+wfId; // converting into string            
            // first saving the information locally
            var info = {
                // workflow related info
                wf:{
                    id: wfId
                },
                // activity related info
                avt:{
                    id:actId                    
                } 
            };            
            // saving the information with both keys
            var PM = pubObj.PersistenceManager;
            PM.set(ME._getKey(actId),info);   
        },
        /**
         * This method tells whether the given workflow is in progress or not
         */
        isWorkflowInProgress: function(workflowId){
            var ME = this;
            var PM = pubObj.PersistenceManager;
            return PM.get(ME._getKey(workflowId)) != null;
        },
        /**
         * This method should be called at the workflow side to open the activity
         * 
         */        
        openActivity: function(wfId,eleId,actId,url){
            var ME = this;            
            wfId = ""+wfId; // converting into string            
            // first saving the information locally
            var info = {
                // workflow related info
                wf:{
                    eleId:eleId,
                    id: wfId,
                    draft:wfId.indexOf("wf_")!=-1
                },
                // activity related info
                avt:{
                    id:actId                    
                } 
            };            
            // saving the information with both keys
            var PM = pubObj.PersistenceManager;
            PM.set(ME._getKey(wfId),info);
            PM.set(ME._getKey(actId),info);        
            window.location.href = url; // loading the url
        },
        /**
         * This method will link the given activity id with the workflowId
         * @param workflowId workflow id to be linked
         * @param activityId activity id
         */
        linkActivityId:function(workflowId,activityId){
            
        },
        isWorkflowInProgressByActivityId: function(activityId){
            var ME = this;
            var PM = pubObj.PersistenceManager;
            var info = PM.get(ME._getKey(activityId));
            return (info != null);
        },
        /**
         * This method should be called at the activity side to resume the workflow
         * @param activityId
         * @param activityInfo
         */
        openWorkflow: function(activityId,activityInfo){
            var ME = this;
            var PM = pubObj.PersistenceManager;
            var info = PM.get(ME._getKey(activityId));            
            if(info){
                var wf = info.wf;
                var url = "/account/workflow/";
                url += wf.id;
                var wfInfo = PM.get(ME._getKey(wf.id));
                wfInfo.avt.id = activityInfo.campaignId;
                wfInfo.avt.name = activityInfo.campaignName;
                PM.set(ME._getKey(wf.id),wfInfo);                
                // now removing the local key
                PM.remove(ME._getKey(activityId));
                window.location.href = url; // loading the url                
            }            
        },
        /**
         * This method will try to resume the current workflow
         * @param workflowId
         */
        resumeWorkflow: function(workflowId){
            var ME = this;
            var _obj = {};            
            var PM = pubObj.PersistenceManager;
            var info = PM.get(ME._getKey(workflowId));
            if(info){
                _obj = {
                    eleId: info.wf.eleId,
                    data:{
                        value:info.avt.id,
                        text:info.avt.name
                    }
                }
                // now removing the local key
                PM.remove(ME._getKey(workflowId));
            }
            return _obj;
        },
        /**
         * This method updates the given activity id with the new id
         * @param oldId old activity Id (like a draft id)
         * @param newId
         */
        updateActivityId: function(oldId,newId){
            var ME = this;
            var PM = pubObj.PersistenceManager;            
            var info = PM.get(ME._getKey(oldId));            
            if(info){
                PM.set(ME._getKey(newId),info);// updating the old key with new key
                // Now removing the old key
                PM.remove(ME._getKey(oldId)); // removeing the old key
            }
        },
        /**
         * This methow will automatically redirect ot the workfloa page         
         */
        autoRedirectToWorkflow: function(){            
            C$.notifier.loading("Please wait! redirecting back to workflow");
            window.setTimeout(function(){
                if(window.actionBarHandler){
                    window.actionBarHandler('BACK_TO_WORKFLOW');
                }        
            },5000); // redirecting back to workflow after 5 seconds delay
        },
        
        autoRedirectTo: function(path,msg){            
            C$.notifier.loading(msg);
            window.setTimeout(function(){
                window.location = path;
            },3000); // redirecting to specified path after 3 seconds delay
        }
    }
    /**
     * this alias for the accountload
     */
    pubObj.whenAccountReady = function(_cb){
        pubObj.afterAccountLoad(_cb);
    }    
    pubObj.afterAccountLoad = function(_cb){
        var ME = this;
        if(ME.AccountInfo == undefined){
            accountLoadCallStack.push(_cb);
            //console.log("----> Assing to the call stack");
            //window.setTimeout(function(){
            //    ME.afterAccountLoad(_cb);    
            //}, 500)
            return;
        }else{            
            _cb.call(ME.AccountInfo);            
        }        
    }
    
    /**
     *
     */
    pubObj.scrollTo = function($ele){
        $ele.scrollToMe();
    }
    
    /**
     *@Rohit, converting large numbers readable
     */
    pubObj.convertToReadable = function(x){
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }
    
    /**
     * This object for credits alert
     */
    pubObj.CreditsAlert = {
        notificationDiv: null,
        creditStatus :{},
        loaded: false,
        planType:null,
        resObj:{},
        COOKIE_NAME : '_cnv_cookie_credit_alert_notification_bar_UI',
        
        init : function(){
            var ME = this;
            var cookieVal = CookieHandler.readCookie(ME.COOKIE_NAME); // first reading the cookie
            
            if(cookieVal != 'hide'){ // if the cookie value is not hide then only show            
                var ME = this;
                ME.loadData(function(obj){                    
                    var warningLevel = 0; // assuming no warning
                    if(obj != null){
                        ME.resObj = obj;
                        ME.planType = obj.planType;
                        warningLevel = obj.warningLevel;
                        ME.creditStatus = obj.creditStatus;
                    
                        ME.loaded = true; // setting the flag
                    }
                    // not showing for iframes
                    if(!AM_I_IFRAME){
                        ME.showNotification(warningLevel);                
                    }
                });
            }
        },
        /**
         * This method returns the accessible campaigns
         * if it response with null means all campaigns can be accessible
         */
        getAccessibleCampaigns : function(_cb){
            var ME = this;
            if(ME.loaded != true){
                window.setTimeout(function(){
                    ME.getAccessibleCampaigns(_cb);                    
                }, 200);
                return;
            }
            var campaigns = null;
            switch(ME.planType){
                case 'TIER_1':
                    campaigns = ['SMS_MARKETING','NEWS_LETTER_SIGNUP_CAMPAIGN','EMAIL_MARKETING_CAMPAIGN','DRIP_MARKETING_CAMPAIGN'];
                    break;
            }
            if(_cb){
                _cb(campaigns);
            }
        },
        getCreditStatus : function(_cb){
            var ME = this;
            if(ME.loaded != true){
                window.setTimeout(function(){
                    ME.getCreditStatus(_cb);                    
                }, 200);
                return;
            }
            if(_cb){
                _cb(ME.creditStatus);
            }
            return ME.creditStatus;
        },
        loadData : function(_cb){
            var ME = this;
            $.get('/account/xhr/account_details_for_notification',{},
                function(data){                    
                    data = eval("("+data+")");
                    var _obj = null;
                    switch(data.status){
                        case 'SUCCESS':
                            _obj = eval("("+data.json+")");
                            break;
                        case 'FAIL':
                            break;
                    }
                    if(_cb){
                        _cb(_obj);
                    }                
                });
        },    
        showNotification : function(warning){
            var ME = this;
            var freeTrialOver = false;
            if(ME.resObj.planType == 'FREE_TRIAL' && !ME.resObj.isAccountValid){
                freeTrialOver = true;
            }
            warning = warning==undefined?0:warning;
            // if there is warning level or the account is not valid then only showing
            if(warning>0 || freeTrialOver){
                var _msg = "";
                if(freeTrialOver){                    
                    _msg = "Your Free Trial has expired so your account features are now restricted.";
                }else{
                    switch(warning){
                        case 1:
                            _msg = "You are close to your credit limit.";
                            break;                    
                        case 2:
                        case 3:
                            if(ME.resObj.overageAllowed == true){ // if the overage is allowed
                                _msg = "You have exceeded your account credit limits, overages may now apply for any contacts added, email or SMSes sent.";
                            }else{ // overage is not allowed
                                _msg = "You are over your credit limit.";
                            }                            
                            break;
                    }
                }                     
                $(function(){
                    if(ME.notificationDiv == null){
                        ME.notificationDiv = $("<div />")
                        var cnt = "<div style='text-align:center;position:relative;'>"+
                        "<span action='CLOSE' title='Close' style='position: absolute;top: -16px;right: 19px;cursor: pointer;'>x</span>"+
                        "<div style='font-size:1.4em;margin-bottom:6px;'>"+_msg+" "+                        
                        "<a href='/account/settings/update-account' style='text-decoration:underline;cursor:pointer;'>Upgrade</a>"+
                        " to continue."+
                        "</div>"+
                        "<a href='/account/settings/billing-details'>View account details</a>"+                            
                        "</div>";
                        ME.notificationDiv.html(cnt);
                        ME.notificationDiv.append("");
                    
                        $('body').prepend(ME.notificationDiv);
                        ME.notificationDiv.hide();
                    
                        $(ME.notificationDiv).on("click","[action]",function(){
                            var act = $(this).attr('action');                            
                            switch(act){
                                case 'CLOSE':
                                    ME.closeNotification();
                                    break;
                            }                        
                        });
                    }
                    ME.notificationDiv.show();                    
                    ME.notificationDiv.css({
                        "position":'fixed',
                        "bottom":'0px',
                        "width":'100%',
                        "opacity":'0.1',
                        "padding":' 20px 10px',                    
                        "font-weight":'bold',
                        "background":'rgb(241, 236, 143)',
                        "border-bottom": "1px solid rgb(221, 221, 221)",
                        "color":'rgb(233, 75, 75)',
                        "z-index":'999'                    
                    });
                    ME.notificationDiv.animate({
                        opacity:0.9
                    },1000);
                });
            }
        },
        closeNotification: function(){
            var ME = this;
            // setting the cookie for next 30 minutes
            CookieHandler.createCookieForMinutes(ME.COOKIE_NAME, "hide", 30);            
            ME.notificationDiv.slideUp(800,function(){
                ME.notificationDiv.hide();
            });
        }
    }
    
    
    /**
     * This class is dedicated for data validations
     */
    pubObj.DataValidator = {
        isValidEmail: function(value){
            return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(value);
        }
    },
    
    /**
     * This method revalidates the given container for the user permissions
     * This method shoulld be called after rendering any ajax content to revalidate the actions
     * based on the current user permission
     */
    pubObj.revalidatePermissions = function(div){
        _UserPermissionsHandler.reValidate(div);
    }
    
    /**
     * This method will scan the given container and replaces all the tokens
     */
    pubObj.scanContainer = function(div){
        $(div).find('app-name').each(function(){            
            $(this).after(pubObj.APP_NAME).remove();
        });
    }
    
    // all the APIs
    pubObj.triggerEvent = function(event){
        var ME = this;
        var eventOpt = {};
        var $pageBody = $('cnv-page');        
        switch(event){
            case 'PAGE_LOAD':
                eventOpt = {
                    pageId: $pageBody.attr('page-id'),
                    menu: $pageBody.attr('menu'),
                    sidebar: $pageBody.attr('sidebar')
                }                
                break;
        }
        _HANDLERS[event](eventOpt);    
    }
    
    
    
    pubObj.button = function(btnObj, val,loadingtext){
        var $obj = $(btnObj);        
        try{
            val = val.toLowerCase();
            if(val === "loading"){                
                $(btnObj).addClass('disabled');
                loadingtext = loadingtext || $(btnObj).attr('data-loading-text') || 'Loading...';                
                var originalBtnText = $(btnObj).text();                    
                $(btnObj).text(loadingtext);                
                $(btnObj).prepend(getAnimatedIconHtmlForBtn());
                $(btnObj).attr('data-loading-reset-text', originalBtnText);                
            } else if(val === "reset"){                
                $(btnObj).find('i.fa-spin').remove();
                $(btnObj).text($(btnObj).attr('data-loading-reset-text'));
                $(btnObj).removeClass('disabled');
            }
        } catch(err){
        }
    }
    
    
    /**
     *
     */
    pubObj.TopActionsHeader = {
        $actionBar:null,
        _initialized:false,
        _callStack:[],
        actionHandler:'actionBarHandler',
        init: function(){
            var ME = this;
            ME.$actionBar = $('#_topActionsBarDiv');
            var $pageBody = $('cnv-page');
            var actions = $pageBody.attr('actions');
            ME.$actionBar.on('click','.header-actions a.btn',function(){
                var $ele = $(this);
                var text = $ele.text();
                if($.isFunction(window[ME.actionHandler])){
                    var _key = $ele.attr('act-key');
                    _key = (_key==undefined || _key == '')?text:_key;
                    window[ME.actionHandler](_key,$ele);
                }else{
                    log("actions handler is not implemented!");
                }
            });
            if(actions != undefined && actions != ''){
                if($pageBody.attr('action-handler') != undefined){
                    ME.actionHandler = $pageBody.attr('action-handler');
                }
                actions = actions.split(";");
                ME.setButtons(actions);                
            } else {
                /**
                 *@Rohit, call action handler if no button is der
                 */
                if($pageBody.attr('action-handler') != undefined){
                    ME.actionHandler = $pageBody.attr('action-handler');
                    if($.isFunction(window[ME.actionHandler])){
                        window[ME.actionHandler]();
                    }else{
                        log("actions handler is not implemented!");
                    }
                }
            }
            // now calling all the waiting callbacks once its initailied            
            ME._initialized = true;
            for(var i=0;i<ME._callStack.length;i++){
                ME._callStack[i].call(ME);
            }
            ME._callStack = [];
        },
        ready:function(_cb){
            var ME = this;
            if(ME._initialized === false){
                ME._callStack.push(_cb);                
            }else{                
                _cb.call(ME);
            }
        },
        setButtons: function(actions){
            var ME = this;
            var $actionsDiv = ME.$actionBar.find('.header-actions');
            $actionsDiv.html(pubObj.Utill.generateButtons(actions));
            // validating the user permissions
            pubObj.revalidatePermissions(ME.$actionsDiv);
        },
        appendButtons: function(){},
        prependButtons: function(){},
        parseActionString: function(val){
            var action = {
                type:'button'
            };
            function parseAttr(tkn){
                if(tkn.indexOf("(") == 0 && tkn.indexOf(")") == tkn.length-1){
                    tkn = tkn.replace("(", "").replace(")","");
                    var tkns = tkn.split(",");
                    switch(tkns[0]){                            
                        case 'l':
                            break;
                        case 'b':
                        default:
                            break;
                    }
                }else{                    
                    action.type = 'button';                    
                    switch(tkn){
                        case 'p':
                            action.button = 'btn-primary';
                            break;
                        case 's':
                            action.button = 'btn-success';
                            break;
                        default:
                            action.button = 'btn-default';
                    }                    
                }
            }            
            var vals = val.split(':');
            //console.log(vals);
            action.text = vals[0];
            for(var i=1;i<vals.length;i++){
                parseAttr(vals[i]);
            }
            
            return action;
        },
        renderBreadcrumb: function($ele){
            var ME = this;
            if($ele == undefined){
                return;
            }
            var _cnt = "";
            var li = [];
            li.push({
                text:$ele.text()
            });
            $ele.parents('.treeview').each(function(){                
                var $a = $(this).find('>a');
                li.push({
                    text:$a.text(),
                    link:$a.attr('href')
                });
            });
            for(var i=li.length-1;i>=0;i--){
                _cnt += ("<li class='"+(i==0?'active':'')+"'>");
                if(li[i].link){
                    _cnt += ("<a href='"+li[i].link+"'>");
                }
                _cnt += li[i].text;
                if(li[i].link){
                    _cnt += ("</a>");
                }                
            }
            ME.$actionBar.find('.breadcrumb').html(_cnt);
        }
    }
    
    /**
     * THis method makes the given container as a sticky block
     */    
    pubObj.stickyBlock = function(div,relativeDiv){
        var $div = $(div);
        var $relDiv = relativeDiv || null;
        var offset;
        var defaultPadding = 60;        
        $(window).scroll(function() {
            offset = offset || $div.offset();            
            var margin = $(window).scrollTop()-offset.top + defaultPadding;
            if($relDiv != null){
                margin = ($relDiv.height() > (margin+$div.outerHeight()))?margin:$relDiv.height()-$div.outerHeight();
            }            
            if(margin > 0){
                $div.css('margin-top',margin);
            }else{
                $div.css('margin-top',0);
            }
        });
    }
    
    /**
     * This is an abstract class of the designers like email, landing page, workflow etc...
     */
    pubObj.AbstractDesigner = function (){
        this.$container = null;
        this.opts = null;
        this.initialized = true; // by default assuming initialized
    }
    pubObj.AbstractDesigner.prototype = {
        init: function(container,opts){
            this.$container = container;
            this.opts = opts;
        },
        ready:function(_cb){
            this.afterLoad(_cb);            
        },
        /**
         *
         */
        afterLoad : function(_cb){
            var ME = this;
            if(ME.initialized !== true){
                window.setTimeout(function(){
                    ME.afterLoad(_cb);                    
                }, 200);
                return;
            }else{
                _cb.call(ME);
            }
        }
    }
    // ########################################    
    // Global(Public) Scope -- END
    // ########################################
    
    
    // JQuery extension methods    

    $.AdminLTE = {};

    /* --------------------
     * - AdminLTE Options -
     * --------------------
     * Modify these options to suit your implementation
     */
    $.AdminLTE.options = {
        //Add slimscroll to navbar menus
        //This requires you to load the slimscroll plugin
        //in every page before app.js
        navbarMenuSlimscroll: true,
        navbarMenuSlimscrollWidth: "3px", //The width of the scroll bar
        navbarMenuHeight: "200px", //The height of the inner menu
        //Sidebar push menu toggle button selector
        sidebarToggleSelector: "[data-toggle='offcanvas']",
        //Activate sidebar push menu
        sidebarPushMenu: true,
        //Activate sidebar slimscroll if the fixed layout is set (requires SlimScroll Plugin)
        sidebarSlimScroll: true,
        //BoxRefresh Plugin
        enableBoxRefresh: true,
        //Bootstrap.js tooltip
        enableBSToppltip: true,
        BSTooltipSelector: "[data-toggle='tooltip']",
        //Enable Fast Click. Fastclick.js creates a more
        //native touch experience with touch devices. If you
        //choose to enable the plugin, make sure you load the script
        //before AdminLTE's app.js
        enableFastclick: true,
        //Box Widget Plugin. Enable this plugin
        //to allow boxes to be collapsed and/or removed
        enableBoxWidget: true,
        //Box Widget plugin options
        boxWidgetOptions: {
            boxWidgetIcons: {
                //The icon that triggers the collapse event
                collapse: 'fa fa-minus',
                //The icon that trigger the opening event
                open: 'fa fa-plus',
                //The icon that triggers the removing event
                remove: 'fa fa-times'
            },
            boxWidgetSelectors: {
                //Remove button selector
                remove: '[data-widget="remove"]',
                //Collapse button selector
                collapse: '[data-widget="collapse"]'
            }
        },
        //Direct Chat plugin options
        directChat: {
            //Enable direct chat by default
            enable: true,
            //The button to open and close the chat contacts pane
            contactToggleSelector: '[data-widget="chat-pane-toggle"]'
        },
        //Define the set of colors to use globally around the website
        colors: {
            lightBlue: "#3c8dbc",
            red: "#f56954",
            green: "#00a65a",
            aqua: "#00c0ef",
            yellow: "#f39c12",
            blue: "#0073b7",
            navy: "#001F3F",
            teal: "#39CCCC",
            olive: "#3D9970",
            lime: "#01FF70",
            orange: "#FF851B",
            fuchsia: "#F012BE",
            purple: "#8E24AA",
            maroon: "#D81B60",
            black: "#222222",
            gray: "#d2d6de"
        },
        //The standard screen sizes that bootstrap uses.
        //If you change these in the variables.less file, change
        //them here too.
        screenSizes: {
            xs: 480,
            sm: 768,
            md: 992,
            lg: 1200
        }
    };

    /* ------------------
     * - Implementation -
     * ------------------
     * The next block of code implements PACE for browser progress bar
     */
    //    $(function () {
    //        Pace.options = {
    //            ajax: false, // disabled
    //            document: true,
    //            eventLag: false // disabled
    //        };
    //    });

    /* ------------------
     * - Implementation -
     * ------------------
     * The next block of code implements AdminLTE's
     * functions and plugins as specified by the
     * options above.
     */
    $(function () {
        pubObj.CreditsAlert.init();
        pubObj.scanContainer($('body'));
        
        // this code to show the warning for DMARC Changes
        var dmarcCookie = MyUtil.readCookie("_cnv_dmarc_ckie");        
        if(!dmarcCookie && !AM_I_IFRAME && PAGE_URI.indexOf("/account") !== -1){ // making sure that the page is under account path
            pubObj.afterAccountLoad(function(){            
                if(pubObj.AccountInfo && pubObj.AccountInfo.account && pubObj.AccountInfo.account.contactEmail){                
                    var contactEmail = pubObj.AccountInfo.account.contactEmail.toLocaleLowerCase();                
                    if(pubObj.Utill.isValidEmailSender(contactEmail) === false) {
                        C$.stickyNote.warning("To ensure you get high email deliverability, please update your business email address to a non-Gmail/non-Yahoo corporate email address. <a href='/account/settings/business_details'>Update Now</a>",-1);                        
                    }
                }            
            });            
        }                
        
        //Easy access to options
        var o = $.AdminLTE.options;

        //Activate the layout maker
        $.AdminLTE.layout.activate();

        //Enable sidebar tree view controls
        $.AdminLTE.tree('.sidebar');

        //Add slimscroll to navbar dropdown
        if (o.navbarMenuSlimscroll && typeof $.fn.slimscroll != 'undefined') {
            $(".navbar .menu").slimscroll({
                height: "200px",
                alwaysVisible: false,
                size: "3px"
            }).css("width", "100%");
        }

        //Activate sidebar push menu
        if (o.sidebarPushMenu) {
            $.AdminLTE.pushMenu(o.sidebarToggleSelector);
        }

        //Activate Bootstrap tooltip
        if (o.enableBSToppltip) {
            $(o.BSTooltipSelector).tooltip();
        }

        //Activate box widget
        if (o.enableBoxWidget) {
            $.AdminLTE.boxWidget.activate();
        }

        //Activate fast click
        if (o.enableFastclick && typeof FastClick != 'undefined') {
            FastClick.attach(document.body);
        }

        //Activate direct chat widget
        if (o.directChat.enable) {
            $(o.directChat.contactToggleSelector).click(function () {
                var box = $(this).parents('.direct-chat').first();
                box.toggleClass('direct-chat-contacts-open');
            });
        }

        /*
         * INITIALIZE BUTTON TOGGLE
         * ------------------------
         */
        $('.btn-group[data-toggle="btn-toggle"]').each(function () {
            var group = $(this);
            $(this).find(".btn").click(function (e) {
                group.find(".btn.active").removeClass("active");
                $(this).addClass("active");
                e.preventDefault();
            });

        });
        
        pubObj.triggerEvent('PAGE_LOAD');// triggering the page load event for the first time        
    });

    /* ----------------------
     * - AdminLTE Functions -
     * ----------------------
     * All AdminLTE functions are implemented below.
     */

    /* prepareLayout
     * =============
     * Fixes the layout height in case min-height fails.
     *
     * @type Object
     * @usage $.AdminLTE.layout.activate()
     *        $.AdminLTE.layout.fix()
     *        $.AdminLTE.layout.fixSidebar()
     */
    $.AdminLTE.layout = {
        activate: function () {
            var _this = this;
            _this.fix();
            _this.fixSidebar();
            $(window, ".wrapper").resize(function () {
                _this.fix();
                _this.fixSidebar();
            });
        },
        fix: function () {
            //Get window height and the wrapper height
            var neg = $('.main-header').outerHeight() + $('.main-footer').outerHeight();
            var window_height = $(window).height();
            var sidebar_height = $(".sidebar").height();            
            //Set the min-height of the content and sidebar based on the
            //the height of the document.
            if ($("body").hasClass("fixed")) {
                //console.log(window_height+" ==> "+sidebar_height);
                $(".content-wrapper, .right-side").css('min-height', window_height - $('.main-footer').outerHeight());
            } else {                
                if (window_height >= sidebar_height) {
                    $(".content-wrapper, .right-side").css('min-height', window_height - neg);
                } else {
                    $(".content-wrapper, .right-side").css('min-height', sidebar_height);
                }
            }
        },
        fixSidebar: function () {
            //Make sure the body tag has the .fixed class
            if (!$("body").hasClass("fixed")) {
                if (typeof $.fn.slimScroll != 'undefined') {
                    $(".sidebar").slimScroll({
                        destroy: true
                    }).height("auto");
                }
                return;
            } else if (typeof $.fn.slimScroll == 'undefined' && console) {
                console.error("Error: the fixed layout requires the slimscroll plugin!");
            }
            //Enable slimscroll for fixed layout
            if ($.AdminLTE.options.sidebarSlimScroll) {
                if (typeof $.fn.slimScroll != 'undefined') {
                    //Distroy if it exists
                    $(".sidebar").slimScroll({
                        destroy: true
                    }).height("auto");
                    //Add slimscroll
                    $(".sidebar").slimscroll({
                        height: ($(window).height() - $(".main-header").height()) + "px",
                        color: "rgba(0,0,0,0.2)",
                        size: "3px"
                    });
                }
            }
        }
    };

    /* PushMenu()
     * ==========
     * Adds the push menu functionality to the sidebar.
     *
     * @type Function
     * @usage: $.AdminLTE.pushMenu("[data-toggle='offcanvas']")
     */
    $.AdminLTE.pushMenu = function (toggleBtn) {
        //Get the screen sizes
        var screenSizes = this.options.screenSizes;

        //Enable sidebar toggle
        $(toggleBtn).click(function (e) {
            e.preventDefault();

            //Enable sidebar push menu
            if ($(window).width() > (screenSizes.sm - 1)) {
                $("body").toggleClass('sidebar-collapse');
            }
            //Handle sidebar push menu for small screens
            else {
                if ($("body").hasClass('sidebar-open')) {
                    $("body").removeClass('sidebar-open');
                    $("body").removeClass('sidebar-collapse')
                } else {
                    $("body").addClass('sidebar-open');
                }
            }
        });

        $(".content-wrapper").click(function () {
            //Enable hide menu when clicking on the content-wrapper on small screens
            if ($(window).width() <= (screenSizes.sm - 1) && $("body").hasClass("sidebar-open")) {
                $("body").removeClass('sidebar-open');
            }
        });

    };

    /* Tree()
     * ======
     * Converts the sidebar into a multilevel
     * tree view menu.
     *
     * @type Function
     * @Usage: $.AdminLTE.tree('.sidebar')
     */
    $.AdminLTE.tree = function (menu) {
        var _this = this;

        $("li a", $(menu)).click(function (e) {
            //Get the clicked link and the next element
            var $this = $(this);
            var checkElement = $this.next();

            //Check if the next element is a menu and is visible
            if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
                //Close the menu
                checkElement.slideUp('normal', function () {
                    checkElement.removeClass('menu-open');
                //Fix the layout in case the sidebar stretches over the height of the window
                //_this.layout.fix();
                });
                checkElement.parent("li").removeClass("active");
            }
            //If the menu is not visible
            else if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
                //Get the parent menu
                var parent = $this.parents('ul').first();
                //Close all open menus within the parent
                var ul = parent.find('ul:visible').slideUp('normal');
                //Remove the menu-open class from the parent
                ul.removeClass('menu-open');
                //Get the parent li
                var parent_li = $this.parent("li");

                //Open the target menu and add the menu-open class
                checkElement.slideDown('normal', function () {
                    //Add the class active to the parent li
                    checkElement.addClass('menu-open');
                    parent.find('li.active').removeClass('active');
                    parent_li.addClass('active');
                    //Fix the layout in case the sidebar stretches over the height of the window
                    _this.layout.fix();
                });
            }
            //if this isn't a link, prevent the page from being redirected
            if (checkElement.is('.treeview-menu')) {
                e.preventDefault();
            }
        });
    };

    /* BoxWidget
     * =========
     * BoxWidget is plugin to handle collapsing and
     * removing boxes from the screen.
     *
     * @type Object
     * @usage $.AdminLTE.boxWidget.activate()
     *        Set all of your option in the main $.AdminLTE.options object
     */
    $.AdminLTE.boxWidget = {
        activate: function () {
            var o = $.AdminLTE.options;
            var _this = this;
            //Listen for collapse event triggers
            $(o.boxWidgetOptions.boxWidgetSelectors.collapse).click(function (e) {
                e.preventDefault();
                _this.collapse($(this));
            });

            //Listen for remove event triggers
            $(o.boxWidgetOptions.boxWidgetSelectors.remove).click(function (e) {
                e.preventDefault();
                _this.remove($(this));
            });
        },
        collapse: function (element) {
            //Find the box parent
            var box = element.parents(".box").first();
            //Find the body and the footer
            var bf = box.find(".box-body, .box-footer");
            if (!box.hasClass("collapsed-box")) {
                //Convert minus into plus
                element.children(".fa-minus").removeClass("fa-minus").addClass("fa-plus");
                bf.slideUp(300, function () {
                    box.addClass("collapsed-box");
                });
            } else {
                //Convert plus into minus
                element.children(".fa-plus").removeClass("fa-plus").addClass("fa-minus");
                bf.slideDown(300, function () {
                    box.removeClass("collapsed-box");
                });
            }
        },
        remove: function (element) {
            //Find the box parent
            var box = element.parents(".box").first();
            box.slideUp();
        },
        options: $.AdminLTE.options.boxWidgetOptions
    };

    /* ------------------
     * - Custom Plugins -
     * ------------------
     * All custom plugins are defined below.
     */

    /*
     * BOX REFRESH BUTTON
     * ------------------
     * This is a custom plugin to use with the compenet BOX. It allows you to add
     * a refresh button to the box. It converts the box's state to a loading state.
     *
     * @type plugin
     * @usage $("#box-widget").boxRefresh( options );
     */
    (function ($) {

        $.fn.boxRefresh = function (options) {

            // Render options
            var settings = $.extend({
                //Refressh button selector
                trigger: ".refresh-btn",
                //File source to be loaded (e.g: ajax/src.php)
                source: "",
                //Callbacks
                onLoadStart: function (box) {
                }, //Right after the button has been clicked
                onLoadDone: function (box) {
                } //When the source has been loaded

            }, options);

            //The overlay
            var overlay = $('<div class="overlay"><div class="fa fa-refresh fa-spin"></div></div>');

            return this.each(function () {
                //if a source is specified
                if (settings.source === "") {
                    if (console) {
                        console.log("Please specify a source first - boxRefresh()");
                    }
                    return;
                }
                //the box
                var box = $(this);
                //the button
                var rBtn = box.find(settings.trigger).first();

                //On trigger click
                rBtn.click(function (e) {
                    e.preventDefault();
                    //Add loading overlay
                    start(box);

                    //Perform ajax call
                    box.find(".box-body").load(settings.source, function () {
                        done(box);
                    });
                });
            });

            function start(box) {
                //Add overlay and loading img
                box.append(overlay);

                settings.onLoadStart.call(box);
            }

            function done(box) {
                //Remove overlay and loading img
                box.find(overlay).remove();

                settings.onLoadDone.call(box);
            }

        };

    })(jQuery);

    /*
     * TODO LIST CUSTOM PLUGIN
     * -----------------------
     * This plugin depends on iCheck plugin for checkbox and radio inputs
     *
     * @type plugin
     * @usage $("#todo-widget").todolist( options );
     */
    (function ($) {
        $.fn.todolist = function (options) {
            // Render options
            var settings = $.extend({
                //When the user checks the input
                onCheck: function (ele) {
                },
                //When the user unchecks the input
                onUncheck: function (ele) {
                }
            }, options);

            return this.each(function () {

                if (typeof $.fn.iCheck != 'undefined') {
                    $('input', this).on('ifChecked', function (event) {
                        var ele = $(this).parents("li").first();
                        ele.toggleClass("done");
                        settings.onCheck.call(ele);
                    });

                    $('input', this).on('ifUnchecked', function (event) {
                        var ele = $(this).parents("li").first();
                        ele.toggleClass("done");
                        settings.onUncheck.call(ele);
                    });
                } else {
                    $('input', this).on('change', function (event) {
                        var ele = $(this).parents("li").first();
                        ele.toggleClass("done");
                        settings.onCheck.call(ele);
                    });
                }
            });
        };
    }(jQuery));
})(window.cnv_developer = window.cnv_developer || {});

// alias for cnv_developer object
var C$ = window.cnv_developer;



/**
 *@Rohit, CustomField creator
 */
(function(pubObj){
    
    pubObj.$CFPopUpDiv;
    pubObj.initialized = false;
       
    function initializeCFCreatorTemplate(){
        var $mainDiv = $('<div class="modal fade" data-keyboard="false" data-backdrop="static" add-custom-field-modal tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" />');
        var cnt = '<div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> <h4 class="modal-title">Add new custom field</h4> </div> <form> <div class="modal-body"> <div class="row"> <div class="col-md-6"> <div class="col-md-12 form-group"> <label for="fieldName">Field name</label> <input type="text" class="form-control required" name="fieldName"/> </div> <div class="col-md-12 form-group"> <label for="fieldDesc">Field description</label> <textarea class="form-control" name="fieldDesc"></textarea> </div> <div class="col-md-12 form-group" fieldTypeInput> <label for="fieldType">Field type</label> </div> <div class="col-md-12 form-group" dynamicValuesRow> </div> <div class="col-md-12 form-group" id="multiSelectCheckBoxDiv" style="display:none"> <label class="checkbox-inline"> <input type="checkbox" multi-check-box value="multiple" /> Allow multiple selections </label> </div> <div class="contentDivider" style=" border-left: 1px solid #CCCCCC; border-right: 1px solid #FFFFFF; height: 100%; float: right; margin-top: 8px; position: absolute; right: 0; "> </div> </div> <div class="col-md-6"> <h4>Preview</h4> <div class="col-md-12 form-group" fieldPreview style="margin-top: 10px;"> <label for="fieldPreview">Field name</label> <input type="text" class="form-control input-preview" name="fieldName"/> </div> </div> </div> </div> <div class="modal-footer"> <input type="hidden" name="fieldId" value="0" /> <button type="button" class="btn btn-flat btn-default" data-dismiss="modal">Close</button> <button type="button" class="btn btn-flat btn-primary" data-loading-text="Adding..." name="addFieldBtn">Add field</button> </div> </form> </div> </div>';
        $mainDiv.append(cnt);
        $mainDiv.find('[multi-check-box]').iCheck({
            checkboxClass: 'icheckbox_minimal-blue',
            increaseArea: '20%' // optional
        });
        pubObj.$CFPopUpDiv = $mainDiv;
    }
       
    function attachCFCreatorModalToBody(){
        if(!pubObj.initialized){
            $('body').append(pubObj.$CFPopUpDiv);
            pubObj.initialized = true;
        }   
    }
    
    function attachMethodToValidator(){
        $.validator.addMethod("custom_field_name", function(value, element) {
            //If false, the validation fails and the message below is displayed
            var name = value;
            return /^[0-9a-zA-Z\s ]+$/.test(name);
        }, "Name should not contain special characters");
        try {
            validateAddNewFieldForm();
        } catch (e) {
            alert(e);
        }
    }
        
    function getDefaultCustomFieldByType(fieldType){
        var _q = {
            fieldId:0,
            fieldName:'',
            fieldType:'',
            multiple:false,
            required:false,
            isChangeFieldTypeDisabled: true
        };
        fieldType = fieldType.toUpperCase()
        switch(fieldType){
            case "DATE":
                _q.fieldType = "TEXT";
                _q.dataType = fieldType;
                break;
        }
        return _q;
    }

    function showFieldPopupDiv(field){
        var addCustomFieldPopup = pubObj.$CFPopUpDiv;
        var form = $('form', addCustomFieldPopup);
        
        field = !field?{
            fieldId:0,
            fieldName:'',
            fieldType:'',
            multiple:false,
            required:false
        }:field;                
                
        $('[name="fieldId"]',form).val(field.fieldId);
        $('[name="fieldName"]',form).val(field.labelName);
        $('[name="fieldDesc"]',form).val(field.description);
        var fieldType = "";
        fieldType = field.fieldType != "" ?field.fieldType:"TEXT";
        if(field.dataType === "NUMBER" || field.dataType === "DATE"){
            fieldType = field.dataType;
        }
        $('[name="fieldType"]',form).val(fieldType);
        $('[name="fieldType"]',form).change();
        if(field.fieldType == 'COMBO_BOX'){
            if(field.multiple){
                $('[multi-check-box]',form).iCheck('check');
            }
                    
            var tagEle = $('[_possiblevals]',form);
            $.each(field.values,function(key,val){                        
                $(tagEle).addTag(val);
            });    
        }
                
        // the user try to edit tyhen disable name editing
        if(field.fieldId != 0){
            $('[name="fieldName"]',form).attr({
                'disabled':'disabled',
                'readonly':'true'
            });                    
            $('[name="fieldType"]',form).attr({
                'disabled':'disabled',
                'readonly':'true'
            });                    
            $('[name="dataType"]',form).attr({
                'disabled':'disabled',
                'readonly':'true'
            });                    
        }else{
            $('[name="fieldName"]',form).removeAttr('disabled');
            $('[name="fieldName"]',form).removeAttr('readonly');                    
            $('[name="fieldType"]',form).removeAttr('disabled');
            $('[name="fieldType"]',form).removeAttr('readonly');                    
            $('[name="dataType"]',form).removeAttr('disabled');
            $('[name="dataType"]',form).removeAttr('readonly');                    
        }
        /**
         *@Rohit, if user forces to use specific attribute then disabled it
         */
        if(field.isChangeFieldTypeDisabled){
            $('[name="fieldType"]',form).attr('disabled', 'true');
        }
                
                
        if(field.required){
            $('[name="required"]',form).attr('checked','checked');
        }else{
            $('[name="required"]',form).removeAttr('checked');
        }                    
        $(addCustomFieldPopup).modal('show');
    }
            
    function hidePopupDiv(addCustomFieldPopup){
        $(addCustomFieldPopup).modal('hide');
    }

    function validateAddNewFieldForm() {
        var addCustomFieldPopup = pubObj.$CFPopUpDiv;
        var form = $('form', addCustomFieldPopup);
        C$.jq(form).validate({
            rules: {
                fieldName: {
                    required: true,
                    custom_field_name:true
                }
            },
                    
            submitHandler: function(form) {
                return false;
            }
        });
    }
    
    
    /**
     * This Class for CustomFields
     */
    var CustomField = {
    
        Field :{
            fieldType:null,
            multiple:false,
            dataType:null,
            fieldName:null,
            labelName:null,
            required:false,
            fieldId:0,
            value:null,
            values:{},
            parseDivForField : function(div,fType){
                var ME = this;
                var field = $.extend({}, this);
                field.labelName = $('input[name="fieldName"]',div).val();
                field.labelName = $.trim(field.labelName); // trimming the extra white spaces;
                field.fieldName = field.labelName.replaceAll(" ", "_");
                field.description = $('[name="fieldDesc"]',div).val();
                //field.required = $('input[name="required"]',div)[0].checked;            
                switch(fType){
                    case 'TEXT':
                        field.fieldType = 'TEXT';
                        field.dataType = 'TEXT';
                        //                    field.dataType = $('select[name="dataType"]',div).val();
                        break;
                    case 'DATE':
                        field.fieldType = 'TEXT';
                        field.dataType = 'DATE';
                        break;
                    case 'NUMBER':
                        field.fieldType = 'TEXT';
                        field.dataType = 'NUMBER';
                        break;
                    case 'COMBO_BOX':
                        field.fieldType = 'COMBO_BOX';
                        if($('[multi-check-box]').is(':checked')) {
                            field.multiple = "true";
                        }
                        field.dataType = 'TEXT';
                        var tokens = $('[_possibleVals]',div).val().split(",");
                        //var tokens = $('.tagsinput',div).val().split(",");                    
                        var tokensObj = {};
                        $('.tagsinput .tag',div).each(function(){
                            var tag = this;
                            var tagText = $('span',tag).text();
                            tagText = $.trim(tagText);
                            tokensObj[tagText] = tagText;                        
                        });                    
                        var valJson = "{"
                        for(var i=0;i<tokens.length;i++){
                            if(i>0){
                                valJson += ",";
                            }
                            valJson += "'"+tokens[i]+"':'"+tokens[i]+"'";
                        //tokensObj[tokens[i]] = tokens[i];
                        //console.log("'"+tokensObj[tokens[i]]+"'");
                        }
                        valJson += "}";
                        //field.values = eval("("+valJson+")");
                        field.values = tokensObj;
                        break;
                    case 'TEXT_AREA':
                        field.fieldType = 'TEXT_AREA';
                        field.dataType = 'TEXT';
                        break;
                }
                return field;
            },        
        
            /**
             * This Method Generates the Input field for the given field
             * this method should be used when ever you want render this field
             */
            generateInputField : function(field){
                var ME = this;
                var cnt = "";            
                var validation = ME.generateValidationClass(field);
                field.value = field.value==undefined?"":field.value;
                switch(field.fieldType){
                    case 'TEXT':
                        cnt += "<input type='text' name='"+field.fieldName+"' value='"+field.value+"' "+validation+" />";
                        break;
                    case 'COMBO_BOX':
                        var multiVal = "";
                        if(field.multiple == true){
                            multiVal = "multiple style='width: 219px;' class='multiSelect'";
                        }
                        cnt += "<select name='"+field.fieldName+"' "+multiVal+" "+validation+">";
                        cnt += "<option value=''></option>";
                    
                        var vals = field.values;
                        $.each(vals,function(key,val){
                            //console.log("Val: "+val+" field.value: "+field.value);
                            key = escape(key);
                        
                            //old condition, works wid only single select
                            /*
                        if(val == field.value){
                            cnt += "<option value='"+key+"' SELECTED>"+val+"</option>";
                        }else{
                            cnt += "<option value='"+key+"'>"+val+"</option>";
                        }        
                             */
                            var DELIM = ';'; //String.fromCharCode(65076); //("&#8203;");
                            var fieldValArray = [];
                            //fieldValArray = $.trim(field.value.split(DELIM));
                            fieldValArray = field.value.split(DELIM);
                       
                            if(fieldValArray.indexOf(val)>=0){
                                cnt += "<option value='"+key+"' SELECTED>"+val+"</option>"; 
                            }
                            else{
                                cnt += "<option value='"+key+"'>"+val+"</option>";
                            }
                        });                    
                        cnt += "</select>"
                        break;
                    case 'TEXT_AREA':
                        cnt += "<textarea name='"+field.fieldName+"' "+validation+">"+field.value+"</textarea>";
                        break;
                }
            
                return cnt;
            },
        
            /**
             * This Method Generates the Input field for the given field
             * this method should be used when ever you want render this field
             */
            generateInputField_Ecomm : function(field){
                var ME = this;
                var cnt = "";            
                var validation = ME.generateValidationClassEcomm(field);
                field.value = field.value==undefined?"":field.value;
                switch(field.fieldType){
                    //                case 'TEXT':
                    //                    cnt += "<input type='text' name='"+field.fieldName+"' value='"+field.value+"' "+validation+" />";
                    //                    break;
                    case 'COMBO_BOX':
                        var multiVal = "";
                        if(field.multiple == true){
                            multiVal = "multiple='multiple'";
                            cnt += "<select name='"+field.fieldName+"' "+multiVal+" "+validation+">";
                        } else {
                            cnt += "<select name='"+field.fieldName+"' "+validation+">";
                            cnt += "<option value=''>Select a value</option>";
                        }
                    
                        var vals = field.values;
                        $.each(vals,function(key,val){
                            //console.log("Val: "+val+" field.value: "+field.value);
                            key = escape(key);
                        
                            //old condition, works wid only single select
                            /*
                        if(val == field.value){
                            cnt += "<option value='"+key+"' SELECTED>"+val+"</option>";
                        }else{
                            cnt += "<option value='"+key+"'>"+val+"</option>";
                        }        
                             */
                            var DELIM = ';'; //String.fromCharCode(65076); //("&#8203;");
                            var fieldValArray = [];
                            //fieldValArray = $.trim(field.value.split(DELIM));
                            fieldValArray = field.value.split(DELIM);
                       
                            if(fieldValArray.indexOf(val)>=0){
                                cnt += "<option value='"+key+"' SELECTED>"+val+"</option>"; 
                            }
                            else{
                                cnt += "<option value='"+key+"'>"+val+"</option>";
                            }
                        });                    
                        cnt += "</select>"
                        break;
                    case 'TEXT_AREA':
                        cnt += "<textarea name='"+field.fieldName+"' "+validation+">"+field.value+"</textarea>";
                        break;
                    default:
                        //For Text, Date and Number
                        cnt += "<input type='text' name='"+field.fieldName+"' value='"+field.value+"' "+validation+" />";
                        
                }
            
                return cnt;
            },
            /**
             *
             */
            generateValidationClass : function(field){
                var cls = "class='";
                if(field.required){
                    cls += "required";
                }
                switch(field.dataType){
                    case 'TEXT':
                        break;
                    case 'DATE':
                        cls += ' dateField';
                        break;
                    case 'NUMBER':
                        cls += ' digits';
                        break;
                }
                cls += "'";
                return cls;            
            },
            generateValidationClassEcomm : function(field){
                var cls = "class='form-control";
                if(field.required){
                    cls += "required";
                }
                switch(field.dataType){
                    case 'TEXT':
                        break;
                    case 'DATE':
                        cls += ' dateField';
                        break;
                    case 'NUMBER':
                        cls += ' number';
                        break;
                }
                cls += "'";
                return cls;            
            }
        },
        FieldType : ['TEXT', 'TEXT_AREA', 'DATE', 'NUMBER', 'COMBO_BOX'],
        DataType :['TEXT', 'DATE', 'NUMBER'],
    
        /**
         * This Method Generates the Custom Fields Input Table Object
         */
        generateCustomFieldsInputTable : function(fields,opt){
            opt = !opt?{}:opt;
            var ME = this;
            var cnt = "<table class='"+opt.tableClass+"'>";
            for(var i=0;i<fields.length;i++){
                cnt += "<tr><td class=''>"+fields[i].labelName+(fields[i].required?"<span class='requireField'> *</span>":"")+"</td>";
                cnt += "<td>"+ME.Field.generateInputField(fields[i])+"</td>";
                cnt += "</tr>";
            }
            cnt += "</table>";
            return cnt;
        },
    
        /**
         * This Method Generates the Custom Fields Input Table Object
         */
        generateCustomFieldsEcommInputs : function(fields,opt){
            opt = !opt?{}:opt;
            var ME = this;
            var cnt_row = "<div class='row'>";
            var rowElementCount = 0;
            for(var i=0;i<fields.length;i++){
                var cnt_col = '<div class="col-md-6 form-group">';
                cnt_col += '<label for='+fields[i].labelName+'>'+fields[i].labelName+'</label>';
                cnt_col += ME.Field.generateInputField_Ecomm(fields[i]);
                cnt_col += '</div>';
                cnt_row += cnt_col;
                if( ++rowElementCount == 2 && i<fields.length - 1){
                    rowElementCount = 0;
                    cnt_row += "</div>";
                    cnt_row += "<div class='row'>";
                }
            }
            cnt_row += "</div>";
            return cnt_row;
        },
    
        /**
         * This Method Generates the Custom Fields Input Table Object
         */
        generateCustomFieldsInputTable_Ecomm : function(fields,opt){
            opt = !opt?{}:opt;
            var ME = this;
            var cnt_row = "<div class='row'>";
            var rowElementCount = 0;
            for(var i=0;i<fields.length;i++){
                var cnt_col = '<div class="col-md-6 form-group">';
                cnt_col += '<label for='+fields[i].labelName+'>'+fields[i].labelName+'</label>';
                cnt_col += ME.Field.generateInputField_Ecomm(fields[i]);
                cnt_col += '</div>';
                cnt_row += cnt_col;
                if( ++rowElementCount == 2 && i<fields.length - 1){
                    rowElementCount = 0;
                    cnt_row += "</div>";
                    cnt_row += "<div class='row'>";
                }
            }
            cnt_row += "</div>";
            return cnt_row;
        },
    
        /**
         * This Method get the input component for the type of the field
         */
        getFieldTypeComponent : function(opt){
            var ME = this;        
            opt = !opt?{}:opt;
            opt.name = !opt.name?'fieldType':opt.name;        
            var cnt = "<select name='"+opt.name+"' class='form-control required'>";
            //        cnt += "<option value=''>Select field type</option>";
            for(var i=0;i<ME.FieldType.length;i++){
                var selected = "";
                if(ME.FieldType[i] === "TEXT"){
                    selected = 'selected="selected"';
                }        
                var selectField = ME.FieldType[i];
                switch(selectField){
                    case "TEXT_AREA":
                        selectField = "TEXT AREA";
                        break;
                    case "COMBO_BOX":
                        selectField = "DROPDOWN";
                        break;
                }
                cnt += "<option value='"+ME.FieldType[i]+"' "+selected+">"+selectField+"</option>";
            }
            cnt += "</select>";
            return cnt;
        },
        /**
         * This Method get the input component for the type of the field
         */
        getDataTypeComponent : function(opt){
            var ME = this;        
            opt = !opt?{}:opt;
            opt.name = !opt.name?'dataType':opt.name;        
            var cnt = "<select name='"+opt.name+"' class='form-control required'>";
            cnt += "<option value=''></option>";
            for(var i=0;i<ME.DataType.length;i++){
                cnt += "<option value='"+ME.DataType[i]+"'>"+ME.DataType[i]+"</option>";
            }
            cnt += "</select>";
            return cnt;
        },
    
        /**
         * 
         */
        registerAddNewFieldDiv : function(div,submitHandler){
            var ME = this;
            var fieldType;
            $('[fieldTypeInput]',div).append(ME.getFieldTypeComponent());
        
            $('select[name="fieldType"]',div).change(function(){
                $('[multi-check-box]',div).iCheck('uncheck');
                fieldType = $(this).val();
                var row = ME.generateValuesInput(fieldType);
                $('[dynamicValuesRow]',div).replaceWith(row);
                //converting to to tags input
                $('[_possiblevals]',row).tagsInput({  
                    'onAddTag':function(value){
                        $('select', 'div[fieldPreview]', div).append('<option value="'+value+'">'+value+'</option>');
                    },
                    'onRemoveTag':function(value){
                        $('select', 'div[fieldPreview]', div).find('option[value="'+value+'"]').remove();
                     
                        $('select', 'div[fieldPreview]', div).change();
                    }              
                });
                
                $('[multi-check-box]',div).on('ifChecked', function(event){
                    $('select', 'div[fieldPreview]', div).attr('multiple','multiple');
                    $('select', 'div[fieldPreview]', div).find('option[value=""]').remove();
                    $('select', 'div[fieldPreview]', div).select2({
                        disabledInputList: true,
                        allowClear: true,
                        placeholder: "Select values"
                    }); 
                }).on('ifUnchecked', function(event){
                    $('select', 'div[fieldPreview]', div).removeAttr('multiple'); 
                    $('select', 'div[fieldPreview]', div).select2('destroy'); 
                });
            
                // now elablish the sorting            
                $('.tagsinput',row).sortable({
                    cursor: "move"
                });          
                        
                // creating the preview
                var field = ME.Field.parseDivForField(div,fieldType);
                ME.registerThePreview(div, field);
                
                $('.dateField', div).daterangepicker({
                    singleDatePicker: true,
                    showDropdowns: true,
                    opens: 'left',
                    format:"DD/MM/YYYY",
                    minDate: '01/01/1900',
                    maxDate: '12/31/2020'
                }, 
                function(start, end, label) {
                    });
            });
        
            $('[name="addFieldBtn"]',div).click(function(event){
                event.preventDefault();
                //alert("Submiting :"+ME.parseDivForField);
                var field = ME.Field.parseDivForField(div,fieldType);
                field.fieldId = $('input[name="fieldId"]',div).val();
                //alert(field.dataType);
                submitHandler(field);
            });
        
            return div;
        },
        /**
         * This Method Reset the input div
         */
        registerThePreview : function(div, field){
            var ME = this;
            var labelName = $('[name="fieldName"]',div).val();
            labelName = (labelName === '') ? 'Field name':labelName;
            var cnt = '<label>'+labelName+'</label>';
            cnt += ME.Field.generateInputField_Ecomm(field);
            $('div[fieldPreview]', div).html(cnt);
        //        if(field.fieldType === "DATE"){
        //            $('div[fieldPreview]', div).find('.dateField').select();
        //            $('div[fieldPreview]', div).find('.dateField').focus();
        //            $('div[fieldPreview]', div).find('.dateField').trigger('click');
        //        }
        },
        /**
         * This Method Reset the input div
         */
        resetInputDiv : function(div){
            $('select[name="fieldType"]',div).val("TEXT").change();
        },
    
        collectData : function(div,fieldType){
            var ME = this;
            var field = null;        
            switch(fieldType){
                case 'TEXT':
                    field = ME.TextField.parse(div);
                    break;
                case 'COMBO_BOX':
                    field = ME.ComboField.parse(div);
                    break;
            }
            return field;
        },
    
        generateValuesInput: function(fieldType){
            var ME = this;
            var cnt = ""
            //var row = document.createElement('tr');
            var row = $('<div class="form-group col-md-12" dynamicValuesRow=""/>')
            $('#multiSelectCheckBoxDiv').hide();
            $('[multi-check-box]').attr('checked',false);
            switch(fieldType){ 
                case 'COMBO_BOX':
                    $('#multiSelectCheckBoxDiv').show();
                    cnt += "<label for='multiSelect'>Add possible values</label>"
                    +"<input type='text' class='form-control' _newVal style='display:none'/><input type='button' _addValBtn value='+' class='btn btn-default' style='margin-top:-5%;display:none;' /><br/>"
                    //+"<textarea _possibleVals disabled='disabled'></textarea>"
                    +"<input type='text' class='form-control' _possibleVals value=''/>";
                    $(row).html(cnt);
                    $('input[_addValBtn]',row).click(function(){                    
                        var val = $('input[_newVal]',row).val();
                        $('input[_newVal]',row).val('');                    
                        if(val.length<1){
                            alert("Enter Proper Value");
                            return;
                        }
                        var txtArea = $('[_possibleVals]',row);                    
                        var tokens = $(txtArea).text().split(",");
                        if($.inArray(val, tokens) == -1){
                            var text = $(txtArea).text();
                            if(text.length<1){
                                $(txtArea).text(val);
                            }else{
                                $(txtArea).text(text+","+val);
                            }
                        }else{
                            alert("Value Already Exist");
                        }
                    });
                    break;
                //            case 'TEXT':
                ////                cnt += "<label for='dateType'>Data type</label>"
                ////                +ME.getDataTypeComponent({});
                ////                $(row).html(cnt);
                ////                break;   
                //            case 'TEXT_AREA':
                //                cnt += "";                
                //                $(row).html(cnt);
                //                break;
                default:
                    cnt += "";                
                    $(row).html(cnt)
            }        
            return row;
        },
    
        /**
* @Rohit, this method creates the custom field on the fly
*/
        initializeCFCreator: function(){
            var ME = this;
            attachMethodToValidator();
            var addCustomFieldPopup = pubObj.$CFPopUpDiv;
            var addCustomFieldDiv = addCustomFieldPopup;
            var addNewFieldForm= $('form', addCustomFieldDiv);   
        
            ME.registerAddNewFieldDiv($(addCustomFieldDiv), function(field) {
                if ($(addNewFieldForm).valid()) {
                    $('label[generated]', addNewFieldForm).remove();
                    C$.get('/account/contacts/xhr/add_custom_field', {
                        customField: JSON.stringify(field)
                    }, {
                        button: $('[name="addFieldBtn"]',addCustomFieldDiv),
                        callback: function(data) {
                            switch (data.status) {
                                case 'SUCCESS':
                                    // reseting the Fields
                                    ME.resetInputDiv($(addCustomFieldDiv));
                                    $(addNewFieldForm).each(function() {
                                        this.reset();
                                    }).find('[generated]').remove();
                                    var field = eval("(" + data.json + ")");
                                    hidePopupDiv(addCustomFieldPopup);
                                    if(pubObj.callback){
                                        pubObj.callback(field);
                                    }
                                    break;
                                case 'FAIL':
                                    switch (data.ERROR_CODE) {
                                        case 'FIELD_ALREADY_EXIST':
                                            $('label[name="error"]', addNewFieldForm).remove();//removing error label
                                            $('input[name="fieldName"]', addNewFieldForm).val("").focus();
                                            var cnt = '<label for="fieldName" class="error" name="error">Field name already exists</label>';
                                            $("input[name='fieldName']", addNewFieldForm).after(cnt);
                                            $("input[name='fieldName']", addNewFieldForm).parent('.form-group').addClass('has-error');
                                            break;
                                    }
                                    break;
                            }
                        }
                    });
                }
            });
        },
        editCustomField: function(field, _cb){
            attachCFCreatorModalToBody();
            if(_cb){
                pubObj.callback = _cb;
            }
            showFieldPopupDiv(field);
        },
        showCustomFieldPopUp: function(fieldType){
            var field;
            if(fieldType && typeof fieldType == "string"){
                field = getDefaultCustomFieldByType(fieldType);
            } else {
                field = fieldType;
            }
            attachCFCreatorModalToBody();
            showFieldPopupDiv(field);
        },
        show : function(fieldType, _cb){
            var ME = this;
            if(typeof fieldType !== "string"){
                _cb = fieldType;
                fieldType = undefined;
            }
            if(_cb){
                pubObj.callback = _cb;
            }
            if(fieldType){
                ME.showCustomFieldPopUp(fieldType);
            } else {
                ME.showCustomFieldPopUp();
            }
        }
    }
    $.extend(pubObj, CustomField);
    
    initializeCFCreatorTemplate();
    pubObj.initializeCFCreator();
    
/**
     * Initializing the global ajax tracker method to track the app level stats
     */
//    $(document).ajaxComplete(function( event, xhr, settings ) {        
//        console.log( "Triggered ajaxComplete handler. The result is ");        
//        console.log( Date.now()-event.timeStamp );        
//    });

})(window.CustomField = !window.CustomField?{}:window.CustomField);
