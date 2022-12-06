// 为原始axios实列添加基本配置default,拦截器interceptors
function Axios(config) {
  this.default = config;
  this.interceptors = {
    request: new interceptorsMannager(),
    response: new interceptorsMannager(),
  };
}

// 在构造函数的原型上添加相关方法

Axios.prototype.request = function (config) {
  // 创建一个成功的promise
  let promise = Promise.resolve(config);
  // undefined用于占位，保持两个一组
  let chains = [dispatchRequest, undefined];

  //  将request里面的handlers数组中存储的请求拦截器的回调从chains数组的前面压入chains数组
  this.interceptors.request.handlers.forEach((item) => {
    chains.unshift(item.fulfilled, item.rejected);
  });
  // 将respanse里面的handlers数组中存储的响应拦截器的回调从chains数组的后面压入chains数组
  this.interceptors.response.handlers.forEach((item) => {
    chains.push(item.fulfilled, item.rejected);
  });
  // 一直循环直到chains数组的长度为0为止
  while (chains.length) {
    promise = promise.then(chains.shift(), chains.shift());
  }

  return promise;
};
Axios.prototype.get = function (config) {
  return this.request({
    method: 'GET',
  });
};
Axios.prototype.post = function (config) {
  return this.request({
    method: 'POST',
  });
};

// 返回一个真正的axios实列
function createInstance(config) {
  // 创建原始axios实列（只有default， interceptors）
  let context = new Axios(config);
  // 让instance成为request函数
  let instance = Axios.prototype.request.bind(context);
  // 让instance拥有定义在Axios构造函数的原型上的方法
  Object.keys(Axios.prototype).forEach((key) => {
    instance[key] = Axios.prototype[key].bind(context);
  });
  // 让instance拥有原始axios实例的default，interceptors属性
  Object.keys(context).forEach((key) => {
    instance[key] = context[key];
  });
  // 返回一个真正的axios实列
  return instance;
}

// 调用xhrAdaptor函数，根据xhrAdaptor函数返回的promise的状态，执行对应的回调，并返回一个promise
function dispatchRequest(config) {
  return xhrAdaptor.then(
    (response) => {
      console.log(response);
    },
    (err) => {
      console.log(err);
    }
  );
}
// 发送http请求，并根据请求是否成功返回一个对应状态的promise
function xhrAdaptor(config) {
  return new Promise((resolbe, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open(config.method, config.url);
    xhr.send();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status <= 300) {
          resolve({
            config: config,
            data: xhr.response,
            request: xhr,
            headlers: xhr.getAllResponseHeaders(),
            status: xhr.status,
            statuText: xhr.statusText,
          });
        } else {
          reject(new Error('请求失败，状态码为：' + xhr.status));
        }
      }
    };
    // 取消请求
    if (config.canleToken) {
      config.canleToken.promise.then(() => {
        xhr.abort();
      });
    }
  });
}

// 为拦截器实例request，response添加一个hander属性
function interceptorsMannager() {
  this.handlers = [];
}
// 在拦截器构造函数的原型上添加use方法，来将拦截器相关的回调存储进hander数组
interceptorsMannager.prototype.use = function (fulfilled, rejected) {
  this.handlers.push({
    fulfilled,
    rejected,
  });
};

// 调用该构造函数时需传递一个函数，然后传递的这个函数的形参就是取消请求的方法
function canleToken(executor) {
  // 用来存储使promise变成功的resolve方法
  var resolvePromise;
  // 为实例添加一个promise属性
  this.promise = new Promise((resolve) => {
    // 将resolve赋值给resolvePromise
    resolvePromise = resolve;
  });
  // 调用形参executor函数将resolve暴露出去
  executor(function () {
    // 执行resolvePromise函数
    resolvePromise();
  });
}
