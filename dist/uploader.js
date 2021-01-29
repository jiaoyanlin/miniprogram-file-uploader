
/**
 * miniprogram-uploader 1.0.0
 * description: A JavaScript library supports miniprogram to upload large file.
 * author: sanfordsun
 * Released under the MIT License.
 */

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var logger = createCommonjsModule(function (module) {
/*!
 * js-logger - http://github.com/jonnyreeves/js-logger
 * Jonny Reeves, http://jonnyreeves.co.uk/
 * js-logger may be freely distributed under the MIT license.
 */
(function (global) {

	// Top level module for the global, static logger instance.
	var Logger = { };

	// For those that are at home that are keeping score.
	Logger.VERSION = "1.6.1";

	// Function which handles all incoming log messages.
	var logHandler;

	// Map of ContextualLogger instances by name; used by Logger.get() to return the same named instance.
	var contextualLoggersByNameMap = {};

	// Polyfill for ES5's Function.bind.
	var bind = function(scope, func) {
		return function() {
			return func.apply(scope, arguments);
		};
	};

	// Super exciting object merger-matron 9000 adding another 100 bytes to your download.
	var merge = function () {
		var args = arguments, target = args[0], key, i;
		for (i = 1; i < args.length; i++) {
			for (key in args[i]) {
				if (!(key in target) && args[i].hasOwnProperty(key)) {
					target[key] = args[i][key];
				}
			}
		}
		return target;
	};

	// Helper to define a logging level object; helps with optimisation.
	var defineLogLevel = function(value, name) {
		return { value: value, name: name };
	};

	// Predefined logging levels.
	Logger.TRACE = defineLogLevel(1, 'TRACE');
	Logger.DEBUG = defineLogLevel(2, 'DEBUG');
	Logger.INFO = defineLogLevel(3, 'INFO');
	Logger.TIME = defineLogLevel(4, 'TIME');
	Logger.WARN = defineLogLevel(5, 'WARN');
	Logger.ERROR = defineLogLevel(8, 'ERROR');
	Logger.OFF = defineLogLevel(99, 'OFF');

	// Inner class which performs the bulk of the work; ContextualLogger instances can be configured independently
	// of each other.
	var ContextualLogger = function(defaultContext) {
		this.context = defaultContext;
		this.setLevel(defaultContext.filterLevel);
		this.log = this.info;  // Convenience alias.
	};

	ContextualLogger.prototype = {
		// Changes the current logging level for the logging instance.
		setLevel: function (newLevel) {
			// Ensure the supplied Level object looks valid.
			if (newLevel && "value" in newLevel) {
				this.context.filterLevel = newLevel;
			}
		},
		
		// Gets the current logging level for the logging instance
		getLevel: function () {
			return this.context.filterLevel;
		},

		// Is the logger configured to output messages at the supplied level?
		enabledFor: function (lvl) {
			var filterLevel = this.context.filterLevel;
			return lvl.value >= filterLevel.value;
		},

		trace: function () {
			this.invoke(Logger.TRACE, arguments);
		},

		debug: function () {
			this.invoke(Logger.DEBUG, arguments);
		},

		info: function () {
			this.invoke(Logger.INFO, arguments);
		},

		warn: function () {
			this.invoke(Logger.WARN, arguments);
		},

		error: function () {
			this.invoke(Logger.ERROR, arguments);
		},

		time: function (label) {
			if (typeof label === 'string' && label.length > 0) {
				this.invoke(Logger.TIME, [ label, 'start' ]);
			}
		},

		timeEnd: function (label) {
			if (typeof label === 'string' && label.length > 0) {
				this.invoke(Logger.TIME, [ label, 'end' ]);
			}
		},

		// Invokes the logger callback if it's not being filtered.
		invoke: function (level, msgArgs) {
			if (logHandler && this.enabledFor(level)) {
				logHandler(msgArgs, merge({ level: level }, this.context));
			}
		}
	};

	// Protected instance which all calls to the to level `Logger` module will be routed through.
	var globalLogger = new ContextualLogger({ filterLevel: Logger.OFF });

	// Configure the global Logger instance.
	(function() {
		// Shortcut for optimisers.
		var L = Logger;

		L.enabledFor = bind(globalLogger, globalLogger.enabledFor);
		L.trace = bind(globalLogger, globalLogger.trace);
		L.debug = bind(globalLogger, globalLogger.debug);
		L.time = bind(globalLogger, globalLogger.time);
		L.timeEnd = bind(globalLogger, globalLogger.timeEnd);
		L.info = bind(globalLogger, globalLogger.info);
		L.warn = bind(globalLogger, globalLogger.warn);
		L.error = bind(globalLogger, globalLogger.error);

		// Don't forget the convenience alias!
		L.log = L.info;
	}());

	// Set the global logging handler.  The supplied function should expect two arguments, the first being an arguments
	// object with the supplied log messages and the second being a context object which contains a hash of stateful
	// parameters which the logging function can consume.
	Logger.setHandler = function (func) {
		logHandler = func;
	};

	// Sets the global logging filter level which applies to *all* previously registered, and future Logger instances.
	// (note that named loggers (retrieved via `Logger.get`) can be configured independently if required).
	Logger.setLevel = function(level) {
		// Set the globalLogger's level.
		globalLogger.setLevel(level);

		// Apply this level to all registered contextual loggers.
		for (var key in contextualLoggersByNameMap) {
			if (contextualLoggersByNameMap.hasOwnProperty(key)) {
				contextualLoggersByNameMap[key].setLevel(level);
			}
		}
	};

	// Gets the global logging filter level
	Logger.getLevel = function() {
		return globalLogger.getLevel();
	};

	// Retrieve a ContextualLogger instance.  Note that named loggers automatically inherit the global logger's level,
	// default context and log handler.
	Logger.get = function (name) {
		// All logger instances are cached so they can be configured ahead of use.
		return contextualLoggersByNameMap[name] ||
			(contextualLoggersByNameMap[name] = new ContextualLogger(merge({ name: name }, globalLogger.context)));
	};

	// CreateDefaultHandler returns a handler function which can be passed to `Logger.setHandler()` which will
	// write to the window's console object (if present); the optional options object can be used to customise the
	// formatter used to format each log message.
	Logger.createDefaultHandler = function (options) {
		options = options || {};

		options.formatter = options.formatter || function defaultMessageFormatter(messages, context) {
			// Prepend the logger's name to the log message for easy identification.
			if (context.name) {
				messages.unshift("[" + context.name + "]");
			}
		};

		// Map of timestamps by timer labels used to track `#time` and `#timeEnd()` invocations in environments
		// that don't offer a native console method.
		var timerStartTimeByLabelMap = {};

		// Support for IE8+ (and other, slightly more sane environments)
		var invokeConsoleMethod = function (hdlr, messages) {
			Function.prototype.apply.call(hdlr, console, messages);
		};

		// Check for the presence of a logger.
		if (typeof console === "undefined") {
			return function () { /* no console */ };
		}

		return function(messages, context) {
			// Convert arguments object to Array.
			messages = Array.prototype.slice.call(messages);

			var hdlr = console.log;
			var timerLabel;

			if (context.level === Logger.TIME) {
				timerLabel = (context.name ? '[' + context.name + '] ' : '') + messages[0];

				if (messages[1] === 'start') {
					if (console.time) {
						console.time(timerLabel);
					}
					else {
						timerStartTimeByLabelMap[timerLabel] = new Date().getTime();
					}
				}
				else {
					if (console.timeEnd) {
						console.timeEnd(timerLabel);
					}
					else {
						invokeConsoleMethod(hdlr, [ timerLabel + ': ' +
							(new Date().getTime() - timerStartTimeByLabelMap[timerLabel]) + 'ms' ]);
					}
				}
			}
			else {
				// Delegate through to custom warn/error loggers if present on the console.
				if (context.level === Logger.WARN && console.warn) {
					hdlr = console.warn;
				} else if (context.level === Logger.ERROR && console.error) {
					hdlr = console.error;
				} else if (context.level === Logger.INFO && console.info) {
					hdlr = console.info;
				} else if (context.level === Logger.DEBUG && console.debug) {
					hdlr = console.debug;
				} else if (context.level === Logger.TRACE && console.trace) {
					hdlr = console.trace;
				}

				options.formatter(messages, context);
				invokeConsoleMethod(hdlr, messages);
			}
		};
	};

	// Configure and example a Default implementation which writes to the `window.console` (if present).  The
	// `options` hash can be used to configure the default logLevel and provide a custom message formatter.
	Logger.useDefaults = function(options) {
		Logger.setLevel(options && options.defaultLevel || Logger.DEBUG);
		Logger.setHandler(Logger.createDefaultHandler(options));
	};

	// Createa an alias to useDefaults to avoid reaking a react-hooks rule.
	Logger.setDefaults = Logger.useDefaults;

	// Export to popular environments boilerplate.
	if ( module.exports) {
		module.exports = Logger;
	}
	else {
		Logger._prevLogger = global.Logger;

		Logger.noConflict = function () {
			global.Logger = Logger._prevLogger;
			return Logger;
		};

		global.Logger = Logger;
	}
}(commonjsGlobal));
});

var config = {
  tempFilePath: '',
  totalSize: 0,
  maxConcurrency: 3,
  chunkSize: 4 * 1024 * 1024,
  maxMemory: 100 * 1024 * 1024,
  chunkRetryInterval: 0,
  maxChunkRetries: 0,
  timeout: 20000,
  successStatus: [200, 201, 202],
  failStatus: [404, 415, 500, 501],
  verbose: false,
  continueByMD5: true, // 断点续传：通过对比本地md5对失败文件的分片进行保存
  forceDirect: false, // 强制直传
  directChunkSize: 4 * 1024 * 1024, // 文件尺寸超过这个值就采用分片，否则直传
};

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (typeof this.events[event] !== 'object') {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.off(event, listener)
  }

  off(event, listener) {
    if (typeof this.events[event] === 'object') {
      const idx = this.events[event].indexOf(listener);
      if (idx > -1) {
        this.events[event].splice(idx, 1);
      }
    }
  }

  emit(event, ...args) {
    if (typeof this.events[event] === 'object') {
      this.events[event].forEach(listener => listener.apply(this, args));
    }
  }

  once(event, listener) {
    const remove = this.on(event, (...args) => {
      remove();
      listener.apply(this, args);
    });
  }
}

var sparkMd5 = createCommonjsModule(function (module, exports) {
(function (factory) {
    {
        // Node/CommonJS
        module.exports = factory();
    }
}(function (undefined$1) {

    /*
     * Fastest md5 implementation around (JKM md5).
     * Credits: Joseph Myers
     *
     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
     * @see http://jsperf.com/md5-shootout/7
     */

    /* this function is much faster,
      so if possible we use it. Some IEs
      are the only ones I know of that
      need the idiotic second function,
      generated by an if clause.  */
    var hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    function md5cycle(x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;

        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;

        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;

        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b  = (b << 21 | b >>> 11) + c | 0;

        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
    }

    function md5blk(s) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    function md5blk_array(a) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
    }

    function md51(s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        }
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);
        return state;
    }

    function md51_array(a) {
        var n = a.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }

        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
        }

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);

        return state;
    }

    function rhex(n) {
        var s = '',
            j;
        for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    }

    function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
        }
        return x.join('');
    }

    // In some cases the fast add32 function cannot be used..
    if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') ;

    // ---------------------------------------------------

    /**
     * ArrayBuffer slice polyfill.
     *
     * @see https://github.com/ttaubert/node-arraybuffer-slice
     */

    if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
        (function () {
            function clamp(val, length) {
                val = (val | 0) || 0;

                if (val < 0) {
                    return Math.max(val + length, 0);
                }

                return Math.min(val, length);
            }

            ArrayBuffer.prototype.slice = function (from, to) {
                var length = this.byteLength,
                    begin = clamp(from, length),
                    end = length,
                    num,
                    target,
                    targetArray,
                    sourceArray;

                if (to !== undefined$1) {
                    end = clamp(to, length);
                }

                if (begin > end) {
                    return new ArrayBuffer(0);
                }

                num = end - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);

                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);

                return target;
            };
        })();
    }

    // ---------------------------------------------------

    /**
     * Helpers.
     */

    function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        return str;
    }

    function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length,
           buff = new ArrayBuffer(length),
           arr = new Uint8Array(buff),
           i;

        for (i = 0; i < length; i += 1) {
            arr[i] = str.charCodeAt(i);
        }

        return returnUInt8Array ? arr : buff;
    }

    function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
    }

    function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);

        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);

        return returnUInt8Array ? result : result.buffer;
    }

    function hexToBinaryString(hex) {
        var bytes = [],
            length = hex.length,
            x;

        for (x = 0; x < length - 1; x += 2) {
            bytes.push(parseInt(hex.substr(x, 2), 16));
        }

        return String.fromCharCode.apply(String, bytes);
    }

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation.
     *
     * Use this class to perform an incremental md5, otherwise use the
     * static methods instead.
     */

    function SparkMD5() {
        // call reset to init the instance
        this.reset();
    }

    /**
     * Appends a string.
     * A conversion will be applied if an utf8 string is detected.
     *
     * @param {String} str The string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.append = function (str) {
        // Converts the string to utf8 bytes if necessary
        // Then append as binary
        this.appendBinary(toUtf8(str));

        return this;
    };

    /**
     * Appends a binary string.
     *
     * @param {String} contents The binary string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.appendBinary = function (contents) {
        this._buff += contents;
        this._length += contents.length;

        var length = this._buff.length,
            i;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }

        this._buff = this._buff.substring(i - 64);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            i,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.reset = function () {
        this._buff = '';
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.prototype.getState = function () {
        return {
            buff: this._buff,
            length: this._length,
            hash: this._hash.slice()
        };
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.setState = function (state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other additional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.prototype.destroy = function () {
        delete this._hash;
        delete this._buff;
        delete this._length;
    };

    /**
     * Finish the final calculation based on the tail.
     *
     * @param {Array}  tail   The tail (will be modified)
     * @param {Number} length The length of the remaining buffer
     */
    SparkMD5.prototype._finish = function (tail, length) {
        var i = length,
            tmp,
            lo,
            hi;

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(this._hash, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
    };

    /**
     * Performs the md5 hash on a string.
     * A conversion will be applied if utf8 string is detected.
     *
     * @param {String}  str The string
     * @param {Boolean} [raw] True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hash = function (str, raw) {
        // Converts the string to utf8 bytes if necessary
        // Then compute it using the binary function
        return SparkMD5.hashBinary(toUtf8(str), raw);
    };

    /**
     * Performs the md5 hash on a binary string.
     *
     * @param {String}  content The binary string
     * @param {Boolean} [raw]     True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hashBinary = function (content, raw) {
        var hash = md51(content),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation for array buffers.
     *
     * Use this class to perform an incremental md5 ONLY for array buffers.
     */
    SparkMD5.ArrayBuffer = function () {
        // call reset to init the instance
        this.reset();
    };

    /**
     * Appends an array buffer.
     *
     * @param {ArrayBuffer} arr The array to be appended
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
            length = buff.length,
            i;

        this._length += arr.byteLength;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }

        this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            i,
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.ArrayBuffer.prototype.getState = function () {
        var state = SparkMD5.prototype.getState.call(this);

        // Convert buffer to a string
        state.buff = arrayBuffer2Utf8Str(state.buff);

        return state;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.setState = function (state) {
        // Convert string to buffer
        state.buff = utf8Str2ArrayBuffer(state.buff, true);

        return SparkMD5.prototype.setState.call(this, state);
    };

    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

    /**
     * Performs the md5 hash on an array buffer.
     *
     * @param {ArrayBuffer} arr The array buffer
     * @param {Boolean}     [raw] True to get the raw string, false to get the hex one
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
        var hash = md51_array(new Uint8Array(arr)),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    return SparkMD5;
}));
});

const isFunction = x => typeof x === 'function';

function promisify(func) {
  if (!isFunction(func)) return func
  return (args = {}) => new Promise((resolve, reject) => {
    func(
      Object.assign(args, {
        success: resolve,
        fail: reject
      })
    );
  })
}

const awaitWrap = (promise) => promise
  .then(data => [null, data])
  .catch(err => [err, null]);

const compareVersion = (v1, v2) => {
  v1 = v1.split('.');
  v2 = v2.split('.');
  const len = Math.max(v1.length, v2.length);

  while (v1.length < len) {
    v1.push('0');
  }
  while (v2.length < len) {
    v2.push('0');
  }

  for (let i = 0; i < len; i++) {
    const num1 = parseInt(v1[i], 10);
    const num2 = parseInt(v2[i], 10);

    if (num1 > num2) {
      return 1
    } else if (num1 < num2) {
      return -1
    }
  }

  return 0
};

function filterParams(params) {
  return Object.keys(params)
    .filter(value => value.startsWith('x:'))
    .map(k => [k, params[k].toString()])
}

function computeMd5(buffer) {
  const spark = new sparkMd5.ArrayBuffer();
  spark.append(buffer);
  const md5 = spark.end();
  spark.destroy();
  return md5
}

function getAuthHeaders(token) {
  const auth = 'UpToken ' + token;
  return {Authorization: auth}
}

// 因为小程序缓存有上限，因此不能一直缓存
const localKey = 'mini_js_sdk_upload_file';
function setLocalFileInfo(size, info) {
  try {
    const data = wx.getStorageSync(localKey);
    wx.setStorageSync(localKey, {
      ...data,
      [size]: info
    });
  } catch (err) {
    console.warn('setLocalFileInfo failed', err);
  }
}

function removeLocalFileInfo(size) {
  try {
    const data = wx.getStorageSync(localKey);
    delete data[size];
    wx.setStorageSync(localKey, data);
  } catch (err) {
    console.warn('removeLocalFileInfo failed', err);
  }
}

function getLocalFileInfo(size) {
  try {
    return (wx.getStorageSync(localKey) || {})[size] || []
  } catch (err) {
    console.warn('getLocalFileInfo failed', err);
    return []
  }
}

function clearExpiredLocalFileInfo() {
  try {
    const data = wx.getStorageSync(localKey);
    if (!data) return
    const newData = {};
    Object.keys(data).forEach(key => {
      const info = data[key] || [];
      const item = info.find(i => i && i.time);
      if (item && !isChunkExpired(item.time)) {
        newData[key] = info;
      }
    });
    wx.setStorageSync(localKey, newData);
  } catch (err) {
    console.warn('getLocalFileInfo failed', err);
  }
}

// 对上传块本地存储时间检验是否过期
// TODO: 最好用服务器时间来做判断
function isChunkExpired(time) {
  // const expireAt = time + 3600 * 24 * 1000
  const expireAt = time + 3600 * 1000 * 100 / 60;
  return new Date().getTime() > expireAt
}

function utf8Encode(argString) {
  // http://kevin.vanzonneveld.net
  // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: sowberry
  // +    tweaked by: Jack
  // +   bugfixed by: Onno Marsman
  // +   improved by: Yves Sucaet
  // +   bugfixed by: Onno Marsman
  // +   bugfixed by: Ulrich
  // +   bugfixed by: Rafal Kukawski
  // +   improved by: kirilloid
  // +   bugfixed by: kirilloid
  // *     example 1: this.utf8Encode('Kevin van Zonneveld');
  // *     returns 1: 'Kevin van Zonneveld'

  if (argString === null || typeof argString === 'undefined') {
    return ''
  }

  const string = argString + ''; // .replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let utftext = '';
  let start;
  let end;
  let stringl = 0;

  start = end = 0;
  stringl = string.length;
  for (let n = 0; n < stringl; n++) {
    let c1 = string.charCodeAt(n);
    let enc = null;

    if (c1 < 128) {
      end++;
    } else if (c1 > 127 && c1 < 2048) {
      enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
    } else if ((c1 & 0xf800) ^ (0xd800 > 0)) {
      enc = String.fromCharCode(
        (c1 >> 12) | 224,
        ((c1 >> 6) & 63) | 128,
        (c1 & 63) | 128
      );
    } else {
      // surrogate pairs
      if ((c1 & 0xfc00) ^ (0xd800 > 0)) {
        throw new RangeError('Unmatched trail surrogate at ' + n)
      }
      const c2 = string.charCodeAt(++n);
      if ((c2 & 0xfc00) ^ (0xdc00 > 0)) {
        throw new RangeError('Unmatched lead surrogate at ' + (n - 1))
      }
      c1 = ((c1 & 0x3ff) << 10) + (c2 & 0x3ff) + 0x10000;
      enc = String.fromCharCode(
        (c1 >> 18) | 240,
        ((c1 >> 12) & 63) | 128,
        ((c1 >> 6) & 63) | 128,
        (c1 & 63) | 128
      );
    }
    if (enc !== null) {
      if (end > start) {
        utftext += string.slice(start, end);
      }
      utftext += enc;
      start = end = n + 1;
    }
  }

  if (end > start) {
    utftext += string.slice(start, stringl);
  }

  return utftext
}

function base64Encode(data) {
  // http://kevin.vanzonneveld.net
  // +   original by: Tyler Akins (http://rumkin.com)
  // +   improved by: Bayron Guevara
  // +   improved by: Thunder.m
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Pellentesque Malesuada
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // -    depends on: this.utf8Encode
  // *     example 1: this.base64Encode('Kevin van Zonneveld');
  // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
  // mozilla has this native
  // - but breaks in 2.0.0.12!
  // if (typeof this.window['atob'] == 'function') {
  //    return atob(data);
  // }
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let o1;
  let o2;
  let o3;
  let h1;
  let h2;
  let h3;
  let h4;
  let bits;
  let i = 0;
  let ac = 0;
  let enc = '';
  const tmp_arr = [];

  if (!data) {
    return data
  }

  data = utf8Encode(data + '');

  do {
    // pack three octets into four hexets
    o1 = data.charCodeAt(i++);
    o2 = data.charCodeAt(i++);
    o3 = data.charCodeAt(i++);

    bits = (o1 << 16) | (o2 << 8) | o3;

    h1 = (bits >> 18) & 0x3f;
    h2 = (bits >> 12) & 0x3f;
    h3 = (bits >> 6) & 0x3f;
    h4 = bits & 0x3f;

    // use hexets to index into b64, and append result to encoded string
    tmp_arr[ac++] =
      b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  } while (i < data.length)

  enc = tmp_arr.join('');

  switch (data.length % 3) {
    case 1:
      enc = enc.slice(0, -2) + '==';
      break
    case 2:
      enc = enc.slice(0, -1) + '=';
      break
  }

  return enc
}

// function base64Decode(data) {
//   // http://kevin.vanzonneveld.net
//   // +   original by: Tyler Akins (http://rumkin.com)
//   // +   improved by: Thunder.m
//   // +      input by: Aman Gupta
//   // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
//   // +   bugfixed by: Onno Marsman
//   // +   bugfixed by: Pellentesque Malesuada
//   // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
//   // +      input by: Brett Zamir (http://brett-zamir.me)
//   // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
//   // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
//   // *     returns 1: 'Kevin van Zonneveld'
//   // mozilla has this native
//   // - but breaks in 2.0.0.12!
//   // if (typeof this.window['atob'] == 'function') {
//   //    return atob(data);
//   // }
//   let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
//   let o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
//     ac = 0,
//     dec = "",
//     tmp_arr = [];

//   if (!data) {
//     return data;
//   }

//   data += "";

//   do { // unpack four hexets into three octets using index points in b64
//     h1 = b64.indexOf(data.charAt(i++));
//     h2 = b64.indexOf(data.charAt(i++));
//     h3 = b64.indexOf(data.charAt(i++));
//     h4 = b64.indexOf(data.charAt(i++));

//     bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

//     o1 = bits >> 16 & 0xff;
//     o2 = bits >> 8 & 0xff;
//     o3 = bits & 0xff;

//     if (h3 === 64) {
//       tmp_arr[ac++] = String.fromCharCode(o1);
//     } else if (h4 === 64) {
//       tmp_arr[ac++] = String.fromCharCode(o1, o2);
//     } else {
//       tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
//     }
//   } while (i < data.length);

//   dec = tmp_arr.join("");

//   return dec;
// }

function urlSafeBase64Encode(v) {
  v = base64Encode(v);
  return v.replace(/\//g, '_').replace(/\+/g, '-')
}

// export function urlSafeBase64Decode(v) {
//   v = v.replace(/_/g, "/").replace(/-/g, "+");
//   return base64Decode(v);
// }

logger.useDefaults({
  defaultLevel: logger.OFF,
  formatter(messages) {
    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    messages.unshift(time);
    messages.unshift('[Uploader]');
  }
});

const fileManager = wx.getFileSystemManager();
const readFileAsync = promisify(fileManager.readFile);
const systemInfo = wx.getSystemInfoSync();

// 清理过期的缓存
clearExpiredLocalFileInfo();

class Uploader {
  constructor(option = {}) {
    // if (option.verbose) Logger.setLevel(Logger.INFO)
    if (option.verbose) logger.setLevel(logger.TRACE);
    logger.debug('construct option ', option);
    // this.config = Object.assign(config, option)
    this.config = {...config, ...option};
    this.emitter = new EventEmitter();
    this.totalSize = this.config.totalSize;
    this.chunkSize = this.config.chunkSize;
    this.continueByMD5 = this.config.continueByMD5;
    this.tempFilePath = this.config.tempFilePath;
    this.totalChunks = Math.ceil(this.totalSize / this.chunkSize);
    this.maxLoadChunks = Math.floor(this.config.maxMemory / this.chunkSize);
    this.isDirectUpload = this.config.forceDirect || this.totalSize < this.config.directChunkSize; // 直传：强制直传或者文件大小小于分片大小
    this._event();
  }

  static isSupport() {
    const version = systemInfo.SDKVersion;
    return compareVersion(version, '2.10.0') >= 0
  }

  async upload() {
    this._reset();

    this.chunksNeedSend = this.chunksIndexNeedSend.length;
    this.sizeNeedSend = this.chunksNeedSend * this.chunkSize;
    if (this.chunksIndexNeedSend.includes(this.totalChunks - 1)) {
      this.sizeNeedSend -= (this.totalChunks * this.chunkSize - this.totalSize);
    }

    logger.debug(`
      start upload
        chunksQueue: ${this.chunksQueue},
        chunksIndexNeedRead: ${this.chunksIndexNeedRead},
        chunksNeedSend: ${this.chunksIndexNeedSend},
        sizeNeedSend: ${this.sizeNeedSend}
    `);

    logger.info('start upload chunks');
    logger.time('[Uploader] uploadChunks');
    // step1: 开始上传
    this.isUploading = true;
    this._upload();
  }

  _requestAsync(args = {}, callback) {
    const {
      chunkRetryInterval,
      maxChunkRetries,
      successStatus,
      failStatus,
      timeout
    } = this.config;

    let retries = maxChunkRetries;
    return new Promise((resolve, reject) => {
      const doRequest = () => {
        const task = wx.request({
          ...args,
          timeout,
          success: (res) => {
            const statusCode = res.statusCode;

            // 标示成功的返回码
            if (successStatus.includes(statusCode)) {
              resolve(res);
            // 标示失败的返回码
            } else if (failStatus.includes(statusCode)) {
              reject(res);
            } else if (retries > 0) {
              setTimeout(() => {
                this.emit('retry', {
                  statusCode,
                  url: args.url
                });
                --retries;
                doRequest();
              }, chunkRetryInterval);
            } else {
              reject(res);
            }
          },
          fail: (res) => {
            reject(res);
          }
        });

        if (isFunction(callback)) {
          callback(task);
        }
      };

      doRequest();
    })
  }

  handleFail(e) {
    if (this.isFail) return
    logger.error('upload file fail: ', e);
    this.isFail = true;
    this.cancel();
    this.emit('fail', e);
    this.emit('complete', e);
  }

  _event() {
    // step2: 发送合并请求
    this.on('uploadDone', async () => {
      logger.timeEnd('[Uploader] uploadChunks');
      logger.info('upload chunks end');
      this.isUploading = false;
      logger.info('start merge reqeust');
      logger.time('[Uploader] mergeRequest');
      const [mergeErr, mergeResp] = await awaitWrap(this.mergeRequest());
      logger.timeEnd('[Uploader] mergeRequest');
      logger.info('merge reqeust end');
      logger.debug('mergeRequest', mergeErr, mergeResp);
      if (this.continueByMD5) removeLocalFileInfo(this.totalSize);
      if (mergeErr) {
        this.handleFail({
          errCode: 20003,
          errrMsg: mergeErr.errMsg,
          errInfo: mergeErr
        });
        return
      }
      logger.info('upload file success');
      this.emit('success', {
        errCode: 0,
        ...mergeResp.data
      });
      this.emit('complete', {
        errCode: 0,
        ...mergeResp.data
      });
    });
    // 直传：当文件大小小于分片大小
    this.on('directUploadDone', async () => {
      const [requestErr, request] = await awaitWrap(this.directUpload());
      this.updateUploadSize(this.totalSize);
      if (requestErr) {
        this.handleFail({
          errCode: 20003,
          errrMsg: requestErr.errMsg,
          errInfo: requestErr
        });
        return
      }
      logger.info('directUploadDone file success');
      this.emit('success', {
        errCode: 0,
        ...request.data
      });
      this.emit('complete', {
        errCode: 0,
        ...request.data
      });
    });
  }

  async _upload() {
    this.startUploadTime = Date.now();
    this._uploadedSize = 0;

    // 直传
    if (this.isDirectUpload) {
      this.emit('directUploadDone');
      return
    }

    if (this.chunksQueue.length) {
      const maxConcurrency = this.config.maxConcurrency;
      for (let i = 0; i < maxConcurrency; i++) {
        this.uploadChunk();
      }
    } else {
      this.readFileChunk();
    }
  }

  directUpload() {
    const {
      key, uphost, token, timeout, successStatus, failStatus, maxChunkRetries, chunkRetryInterval
    } = this.config;
    let retries = maxChunkRetries;
    return new Promise((resolve, reject) => {
      const doRequest = () => {
        this.directTask = wx.uploadFile({
          url: uphost,
          filePath: this.tempFilePath,
          name: 'file',
          formData: {
            key,
            token
          },
          timeout,
          success: (res) => {
            console.log('uploadFile res', res, retries);
            const statusCode = res.statusCode;
            // 标示成功的返回码
            if (successStatus.includes(statusCode)) {
              resolve(res);
            // 标示失败的返回码
            } else if (failStatus.includes(statusCode)) {
              reject(res);
            } else if (retries > 0) {
              setTimeout(() => {
                this.emit('retry', {
                  statusCode,
                  url: this.tempFilePath
                });
                --retries;
                doRequest();
              }, chunkRetryInterval);
            } else {
              reject(res);
            }
          },
          fail(error) {
            reject(error);
          }
        });
      };

      doRequest();
    })
  }

  updateUploadSize(currUploadSize) {
    this.uploadedSize += currUploadSize; // 总体上传大小，暂停后累计
    this._uploadedSize += currUploadSize; // 上传大小，暂停后清空
    const time = Date.now() - this.startUploadTime; // 当前耗时
    const averageSpeed = this._uploadedSize / time; // B/ms
    const sizeWaitSend = this.sizeNeedSend - this.uploadedSize; // 剩余需要发送的大小
    this.timeRemaining = parseInt(sizeWaitSend / averageSpeed, 10); // 剩余时间
    this.averageSpeed = parseInt(averageSpeed, 10) * 1000; // 平均速度 B/s
    this.progress = parseInt(((this.uploadedSize * 100) / this.sizeNeedSend), 10);
    this.dispatchProgress();
  }

  dispatchProgress() {
    this.emit('progress', {
      totalSize: this.totalSize,
      progress: this.progress,
      uploadedSize: this.uploadedSize,
      averageSpeed: this.averageSpeed,
      timeRemaining: this.timeRemaining
    });
  }

  pause() {
    logger.info('** pause **');
    this.isUploading = false;

    if (this.isDirectUpload) {
      this.directTask.abort();
      return
    }

    const abortIndex = Object.keys(this.uploadTasks).map(v => v * 1);
    abortIndex.forEach(index => {
      this.chunksIndexNeedRead.push(index);
      this.uploadTasks[index].abort();
    });
    this.uploadTasks = {};
  }

  resume() {
    logger.info('** resume **');
    this.isUploading = true;
    this._upload();
  }

  cancel() {
    logger.info('** cancel **');
    this.pause();
    this._reset();
  }

  _reset() {
    // [0, 1, 2, 3, 4, 5, ...]，需要被读取的分片的序号数组
    this.chunksIndexNeedRead = Array.from(Array(this.totalChunks).keys());
    this.chunksIndexNeedSend = Array.from(Array(this.totalChunks).keys());
    this.chunksNeedSend = this.totalChunks;
    this.sizeNeedSend = this.totalSize;
    this.chunksSend = 0;
    this.chunksQueue = [];
    this.uploadTasks = {};
    this.isUploading = false;
    this.isFail = false;
    this.progress = 0;
    this.uploadedSize = 0;
    this.averageSpeed = 0;
    this.timeRemaining = Number.POSITIVE_INFINITY;
    this.ctxList = [];
    this.localInfo = this.continueByMD5 ? getLocalFileInfo(this.totalSize) : null;
    this.dispatchProgress();
  }

  readFileChunk() {
    const {
      tempFilePath,
      chunkSize,
      maxLoadChunks,
      chunksQueue,
      chunksIndexNeedRead,
      totalSize
    } = this;
    const chunks = Math.min(chunksIndexNeedRead.length, maxLoadChunks - chunksQueue.length);
    // 异步读取
    logger.debug(`readFileChunk chunks: ${chunks}, chunksIndexNeedRead`, this.chunksIndexNeedRead);
    for (let i = 0; i < chunks; i++) {
      const index = chunksIndexNeedRead.shift();
      const position = index * chunkSize;
      const length = Math.min(totalSize - position, chunkSize);
      if (this.isFail) break

      readFileAsync({
        filePath: tempFilePath,
        position,
        length
      }).then(res => {
        const chunk = res.data;
        let md5 = '';
        if (this.continueByMD5) {
          const t1 = Date.now();
          md5 = computeMd5(chunk);
          console.log('time ' + index, Date.now() - t1);
        }
        this.chunksQueue.push({
          chunk,
          length,
          index,
          md5
        });
        this.uploadChunk();
        return null
      }).catch(e => {
        this.handleFail({
          errCode: 10001,
          errMsg: e.errMsg,
          errInfo: e
        });
      });
    }
  }

  uploadChunk() {
    // 暂停中
    if (!this.isUploading || this.isFail) return
    // 没有更多数据了
    if (!this.chunksQueue.length) return
    // 达到最大并发度
    if (Object.keys(this.uploadTasks).length === this.config.maxConcurrency) return

    const {
      chunk,
      index,
      length,
      md5
    } = this.chunksQueue.shift();

    if (this.continueByMD5) {
      // 通过文件size作为id来缓存上传部分分片后失败的文件
      // 如果缓存中存在该文件，并且对比md5发现某些分片已经上传，则不再重复上传该分片
      const info = this.localInfo[index];
      const savedReusable = info && !isChunkExpired(info.time);
      if (savedReusable && md5 === info.md5) {
        this.ctxList[index] = {...info};
        this.chunksSend++;
        this.updateUploadSize(length);
        // 所有分片发送完毕
        if (this.chunksSend === this.chunksNeedSend) {
          this.emit('uploadDone');
        } else {
          // 尝试继续加载文件
          this.readFileChunk();
          // 尝试继续发送下一条
          this.uploadChunk();
        }
        return
      }
    }

    logger.debug(`uploadChunk index: ${index}, lenght ${length}`);
    logger.time(`[Uploader] uploadChunk index-${index}`);
    const requestUrl = this.config.uphost + '/mkblk/' + length;
    this._requestAsync({
      url: requestUrl,
      data: chunk,
      header: {
        ...getAuthHeaders(this.config.token),
        'content-type': 'application/octet-stream'
      },
      method: 'POST',
    }, (task) => {
      this.uploadTasks[index] = task;
    }).then((res) => {
      this.ctxList[index] = {
        time: new Date().getTime(),
        ctx: res.data.ctx,
        size: length,
        md5
      };
      this.chunksSend++;
      delete this.uploadTasks[index];
      this.updateUploadSize(length);
      logger.debug(`uploadChunk success chunksSend: ${this.chunksSend}`);
      logger.timeEnd(`[Uploader] uploadChunk index-${index}`);
      // 尝试继续加载文件
      this.readFileChunk();
      // 尝试继续发送下一条
      this.uploadChunk();
      // 所有分片发送完毕
      if (this.chunksSend === this.chunksNeedSend) {
        this.emit('uploadDone');
      }
      if (this.continueByMD5) setLocalFileInfo(this.totalSize, this.ctxList);
      return null
    }).catch(res => {
      if (res.errMsg.includes('request:fail abort')) {
        logger.info(`chunk index-${index} will be aborted`);
      } else {
        this.handleFail({
          errCode: 20002,
          errMsg: res.errMsg,
          errInfo: res
        });
      }
    });
  }

  emit(event, data) {
    this.emitter.emit(event, data);
  }

  on(event, listenr) {
    this.emitter.on(event, listenr);
  }

  off(event, listenr) {
    this.emitter.off(event, listenr);
  }

  // 构造file上传url
  createMkFileUrl() {
    const {putExtra, key, uphost} = this.config;
    let requestUrl = uphost + '/mkfile/' + this.totalSize;
    if (key != null) {
      requestUrl += '/key/' + urlSafeBase64Encode(key);
    }
    // 由于没有file.type，因此不处理mimeType
    // if (putExtra.mimeType) {
    //   requestUrl += '/mimeType/' + urlSafeBase64Encode(file.type)
    // }
    const fname = putExtra.fname;
    if (fname) {
      requestUrl += '/fname/' + urlSafeBase64Encode(fname);
    }
    if (putExtra.params) {
      filterParams(putExtra.params).forEach(
        item => (requestUrl += '/' + encodeURIComponent(item[0]) + '/' + urlSafeBase64Encode(item[1]))
      );
    }
    return requestUrl
  }

  async mergeRequest() {
    const requestUrL = this.createMkFileUrl();
    const data = this.ctxList.map(value => value.ctx).join(',');

    const mergeResp = await this._requestAsync({
      url: requestUrL,
      header: {
        ...getAuthHeaders(this.config.token),
        'content-type': 'text/plain'
      },
      data,
      method: 'POST',
    });
    return mergeResp
  }
}

export default Uploader;
//# sourceMappingURL=uploader.js.map
