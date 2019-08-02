/*
 Licensed to the Apache Software Foundation (ASF) under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
// THIS IS AN AUTOMATICALLY COMBINED FILE. PLEASE EDIT source/*.js!!



/******************************************
 Fetched from source/base-http-extensions.js
******************************************/

// URL calls currently 'in escrow'. This controls the spinny wheel animation
var async_escrow = {}
var async_maxwait = 250; // ms to wait before displaying spinner
var async_status = 'clear';
var async_cache = {}
var no_spinner = true;

// Escrow spinner check
async function escrow_check() {
    let now = new Date();
    let show_spinner = false;
    for (var k in async_escrow) {
        if ( (now - async_escrow[k]) > async_maxwait ) {
            show_spinner = true;
            break;
        }
    }
    // Fetch or create the spinner
    if (!no_spinner) {
        let spinner = document.getElementById('spinner');
        if (!spinner) {
            spinner = new HTML('div', { id: 'spinner', class: 'spinner'});
            spinwheel = new HTML('div', {id: 'spinwheel', class: 'spinwheel'});
            spinner.inject(spinwheel);
            spinner.inject(new HTML('h2', {}, "Loading, please wait.."));
            document.body.appendChild(spinner);
        }
        // Show or don't show spinner?
        if (show_spinner) {
            spinner.style.display = 'block';
            if (async_status === 'clear') {
                console.log("Waiting for JSON resource, deploying spinner");
                async_status = 'waiting';
            }
        } else {
            spinner.style.display = 'none';
            if (async_status === 'waiting') {
                console.log("All URLs out of escrow, dropping spinner");
                async_status = 'clear';
            }
        }
    }
}

async function async_snap(error) {
    msg = await error.text();
    msg = msg.replace(/<.*?>/g, ""); // strip HTML tags
    modal("An error occured", "An error code %u occured while trying to fetch %s:\n%s".format(error.status, error.url, msg), "error");
}


// Asynchronous GET call
async function GET(url, callback, state, snap, method, body) {
    method = method || 'get'
    console.log("Fetching JSON resource at %s".format(url))
    let pkey = "GET-%s-%s".format(callback, url);
    let res = undefined;
    let res_json = undefined;
    state = state || {};
    state.url = url;
    if (state && state.cached === true && async_cache[url]) {
        console.log("Fetching %s from cache".format(url));
        res_json = async_cache[url];
    }
    else {
        try {
            let meta = {method: method, credentials: 'include', referrerPolicy: 'unsafe-url', headers: {'x-original-referral': document.referrer}};
            if (body) {
                meta.body = body;
                meta.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            }
            console.log("putting %s in escrow...".format(url));
            async_escrow[pkey] = new Date(); // Log start of request in escrow dict
            const rv = await fetch(url, meta); // Wait for resource...

            // Since this is an async request, the request may have been canceled
            // by the time we get a response. Only do callback if not.
            if (async_escrow[pkey] !== undefined) {
                delete async_escrow[pkey]; // move out of escrow when fetched
                res = rv;
            }
        }
        catch (e) {
            delete async_escrow[pkey]; // move out of escrow if failed
            console.log("The URL %s could not be fetched: %s".format(url, e));
            if (snap) snap({}, {reason: e});
            else {
                modal("An error occured", "An error occured while trying to fetch %s:\n%s".format(url, e), "error");
            }
        }
    }
    if (res !== undefined || res_json !== undefined) {
        // We expect a 2xx return code (usually 200 or 201), snap otherwise
        if ((res_json) || (res.status >= 200 && res.status < 300)) {
            console.log("Successfully fetched %s".format(url))
            if (res_json) {
                js = res_json;
            } else {
                js = await res.json();
                async_cache[url] = js;
            }
            if (callback) {
                callback(state, js);
            } else {
                console.log("No callback function was registered for %s, ignoring result.".format(url));
            }
        } else {
            console.log("URL %s returned HTTP code %u, snapping!".format(url, res.status));
            try {
                js = await res.json();
                snap(state, js);
                return;
            } catch (e) {}
            if (snap) snap(res);
            else modal(res);
        }
    }
}


// DELETE wrapper
async function DELETE(url, callback, state, snap) {
    return GET(url, callback, state, snap, 'delete');
}

// POST wrapper
async function POST(url, callback, state, formdata) {
    return GET(url, callback, state, null, 'post', formdata);
}



/******************************************
 Fetched from source/base-js-extensions.js
******************************************/

/**
 * String formatting prototype
 * A'la printf
 */

String.prototype.format = function() {
  let args = arguments;
  let n = 0;
  let t = this;
  let rtn = this.replace(/(?!%)?%([-+]*)([0-9.]*)([a-zA-Z])/g, function(m, pm, len, fmt) {
      len = parseInt(len || '1');
      // We need the correct number of args, balk otherwise, using ourselves to format the error!
      if (args.length <= n) {
        let err = "Error interpolating string '%s': Expected at least %u argments, only got %u!".format(t, n+1, args.length);
        console.log(err);
        throw err;
      }
      let varg = args[n];
      n++;
      switch (fmt) {
        case 's':
          if (typeof(varg) == 'function') {
            varg = '(function)';
          }
          return varg;
        // For now, let u, d and i do the same thing
        case 'd':
        case 'i':
        case 'u':
          varg = parseInt(varg).pad(len); // truncate to Integer, pad if needed
          return varg;
      }
    });
  return rtn;
}


/**
 * Number prettification prototype:
 * Converts 1234567 into 1,234,567 etc
 */

Number.prototype.pretty = function(fix) {
  if (fix) {
    return String(this.toFixed(fix)).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
  }
  return String(this.toFixed(0)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
};


/**
 * Number padding
 * usage: 123.pad(6) -> 000123
 */

Number.prototype.pad = function(n) {
  var str;
  str = String(this);

  /* Do we need to pad? if so, do it using String.repeat */
  if (str.length < n) {
    str = "0".repeat(n - str.length) + str;
  }
  return str;
};


/* Func for converting a date to YYYY-MM-DD HH:MM */

Date.prototype.ISOBare = function() {
  var M, d, h, m, y;
  y = this.getFullYear();
  m = (this.getMonth() + 1).pad(2);
  d = this.getDate().pad(2);
  h = this.getHours().pad(2);
  M = this.getMinutes().pad(2);
  return y + "-" + m + "-" + d + " " + h + ":" + M;
};


/* isArray: function to detect if an object is an array */

isArray = function(value) {
  return value && typeof value === 'object' && value instanceof Array && typeof value.length === 'number' && typeof value.splice === 'function' && !(value.propertyIsEnumerable('length'));
};


/* isHash: function to detect if an object is a hash */

isHash = function(value) {
  return value && typeof value === 'object' && !isArray(value);
};


/* Remove an array element by value */

Array.prototype.remove = function(val) {
  var i, item, j, len;
  for (i = j = 0, len = this.length; j < len; i = ++j) {
    item = this[i];
    if (item === val) {
      this.splice(i, 1);
      return this;
    }
  }
  return this;
};


/* Check if array has value */
Array.prototype.has = function(val) {
  var i, item, j, len;
  for (i = j = 0, len = this.length; j < len; i = ++j) {
    item = this[i];
    if (item === val) {
      return true;
    }
  }
  return false;
};




/******************************************
 Fetched from source/datepicker.js
******************************************/

var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var datepicker_spawner = null
var calendarpicker_spawner = null
var units = {
    w: 'week',
    d: 'day',
    M: 'month',
    y: 'year'
}

function fixupPicker(obj) {
    obj.addEventListener("focus", function(event){
        $('html').on('hide.bs.dropdown', function (e) {
            return false;
        });
    });
    obj.addEventListener("blur", function(event){
        $('html').unbind('hide.bs.dropdown')
    });
}
// makeSelect: Creates a <select> object with options
function makeSelect(options, id, selval) {
    var sel = document.createElement('select')
    sel.addEventListener("focus", function(event){
        $('html').on('hide.bs.dropdown', function (e) {
            return false;
        });
    });
    sel.addEventListener("blur", function(event){
        $('html').unbind('hide.bs.dropdown')
    });
    sel.setAttribute("name", id)
    sel.setAttribute("id", id)
    // For each options element, create it in the DOM
    for (var key in options) {
        var opt = document.createElement('option')
        // Hash or array?
        if (typeof key == "string") {
            opt.setAttribute("value", key)
            // Option is selected by default?
            if (key == selval) {
                opt.setAttribute("selected", "selected")
            }
        } else {
            // Option is selected by default?
            if (options[key] == selval) {
                opt.setAttribute("selected", "selected")
            }
        }
        opt.text = options[key]
        sel.appendChild(opt)
    }
    return sel
}

// splitDiv: Makes a split div with 2 elements,
// and puts div2 into the right column,
// and 'name' as text in the left one.
function splitDiv(id, name, div2) {
    var div = document.createElement('div')
    var subdiv = document.createElement('div')
    var radio = document.createElement('input')
    radio.setAttribute("type", "radio")
    radio.setAttribute("name", "datepicker_radio")
    radio.setAttribute("value", name)
    radio.setAttribute("id", "datepicker_radio_" + id)
    radio.setAttribute("onclick", "calcTimespan('"+ id + "')")
    var label = document.createElement('label')
    label.innerHTML = "&nbsp; " + name + ": "
    label.setAttribute("for", "datepicker_radio_" + id)
    
    
    subdiv.appendChild(radio)
    subdiv.appendChild(label)
    
    
    subdiv.style.float = "left"
    div2.style.float = "left"
    
    subdiv.style.width = "120px"
    subdiv.style.height = "48px"
    div2.style.height = "48px"
    div2.style.width = "250px"
    
    div.appendChild(subdiv)
    div.appendChild(div2)
    return div
}

// calcTimespan: Calculates the value and representational text
// for the datepicker choice and puts it in the datepicker's
// spawning input/select element.
function calcTimespan(what) {
    var wat = ""
    var tval = ""
    
    // Less than N units ago?
    if (what == 'lt') {
        // Get unit and how many units
        var N = document.getElementById('datepicker_lti').value
        var unit = document.getElementById('datepicker_lts').value
        var unitt = units[unit]
        if (parseInt(N) != 1) {
            unitt += "s"
        }
        
        // If this makes sense, construct a humanly readable and a computer version
        // of the timespan
        if (N.length > 0) {
            wat = "Less than " + N + " " + unitt + " ago"
            tval = "lte=" + N + unit
        }
    }
    
    // More than N units ago?
    if (what == 'mt') {
        // As above, get unit and no of units.
        var N = document.getElementById('datepicker_mti').value
        var unit = document.getElementById('datepicker_mts').value
        var unitt = units[unit]
        if (parseInt(N) != 1) {
            unitt += "s"
        }
        
        // construct timespan val + description
        if (N.length > 0) {
            wat = "More than " + N + " " + unitt + " ago"
            tval = "gte=" + N + unit
        }
    }
    
    // Date range?
    if (what == 'cd') {
        // Get From and To values
        var f = document.getElementById('datepicker_cfrom').value
        var t = document.getElementById('datepicker_cto').value
        // construct timespan val + description if both from and to are valid
        if (f.length > 0 && t.length > 0) {
            wat = "From " + f + " to " + t
            tval = "dfr=" + f + "|dto=" + t
        }
    }
    
    // If we calc'ed a value and spawner exists, update its key/val
    if (datepicker_spawner && what && wat.length > 0) {
        document.getElementById('datepicker_radio_' + what).checked = true
        if (datepicker_spawner.options) {
            datepicker_spawner.options[0].value = tval
            datepicker_spawner.options[0].text = wat
        } else if (datepicker_spawner.value) {
            datepicker_spawner.value = wat
            datepicker_spawner.setAttribute("data", tval)
        }
        
    }
}

// datePicker: spawns a date picker with various
// timespan options right next to the parent caller.
function datePicker(parent, seedPeriod) {
    datepicker_spawner = parent
    var div = document.getElementById('datepicker_popup')
    
    // If the datepicker object doesn't exist, spawn it
    if (!div) {
        div = document.createElement('div')
        var id = parseInt(Math.random() * 10000).toString(16)
        div.setAttribute("id", "datepicker_popup")
        div.setAttribute("class", "datepicker")
    }
    
    // Reset the contents of the datepicker object
    div.innerHTML = ""
    div.style.display = "block"
    
    // Position the datepicker next to whatever called it
    var bb = parent.getBoundingClientRect()
    div.style.top = (bb.bottom + 8) + "px"
    div.style.left = (bb.left + 32) + "px"
    
    
    // -- Less than N $units ago
    var ltdiv = document.createElement('div')
    var lti = document.createElement('input')
    lti.setAttribute("id", "datepicker_lti")
    lti.style.width = "48px"
    lti.setAttribute("onkeyup", "calcTimespan('lt')")
    lti.setAttribute("onblur", "calcTimespan('lt')")
    ltdiv.appendChild(lti)
    
    var lts = makeSelect({
        'd': "Day(s)",
        'w': 'Week(s)',
        'M': "Month(s)",
        'y': "Year(s)"
    }, 'datepicker_lts', 'm')
    lts.setAttribute("onchange", "calcTimespan('lt')")
    ltdiv.appendChild(lts)
    ltdiv.appendChild(document.createTextNode(' ago'))
    
    div.appendChild(splitDiv('lt', 'Less than', ltdiv))
    
    
    // -- More than N $units ago
    var mtdiv = document.createElement('div')
    
    var mti = document.createElement('input')
    mti.style.width = "48px"
    mti.setAttribute("id", "datepicker_mti")
    mti.setAttribute("onkeyup", "calcTimespan('mt')")
    mti.setAttribute("onblur", "calcTimespan('mt')")
    mtdiv.appendChild(mti)
    
    
    var mts = makeSelect({
        'd': "Day(s)",
        'w': 'Week(s)',
        'M': "Month(s)",
        'y': "Year(s)"
    }, 'datepicker_mts', 'm')
    mtdiv.appendChild(mts)
    mts.setAttribute("onchange", "calcTimespan('mt')")
    mtdiv.appendChild(document.createTextNode(' ago'))
    div.appendChild(splitDiv('mt', 'More than', mtdiv))
    
    
    
    // -- Calendar timespan
    // This is just two text fields, the calendarPicker sub-plugin populates them
    var cdiv = document.createElement('div')
    
    var cfrom = document.createElement('input')
    cfrom.style.width = "90px"
    cfrom.setAttribute("id", "datepicker_cfrom")
    cfrom.setAttribute("onfocus", "showCalendarPicker(this)")
    cfrom.setAttribute("onchange", "calcTimespan('cd')")
    cdiv.appendChild(document.createTextNode('From: '))
    cdiv.appendChild(cfrom)
    
    var cto = document.createElement('input')
    cto.style.width = "90px"
    cto.setAttribute("id", "datepicker_cto")
    cto.setAttribute("onfocus", "showCalendarPicker(this)")
    cto.setAttribute("onchange", "calcTimespan('cd')")
    cdiv.appendChild(document.createTextNode('To: '))
    cdiv.appendChild(cto)
    
    div.appendChild(splitDiv('cd', 'Date range', cdiv))
    
    
    
    // -- Magic button that sends the timespan back to the caller
    var okay = document.createElement('input')
    okay.setAttribute("type", "button")
    okay.setAttribute("value", "Okay")
    okay.setAttribute("onclick", "setDatepickerDate()")
    div.appendChild(okay)
    parent.parentNode.appendChild(div)
    document.body.setAttribute("onclick", "")
    window.setTimeout(function() { document.body.setAttribute("onclick", "blurDatePicker(event)") }, 200)
    lti.focus()
    
    // This is for recalcing the set options if spawned from a
    // select/input box with an existing value derived from an
    // earlier call to datePicker
    var ptype = ""
    var pvalue = parent.hasAttribute("data") ? parent.getAttribute("data") : parent.value
    if (pvalue.search(/=|-/) != -1) {
        
        // Less than N units ago?
        if (pvalue.match(/lte/)) {
            var m = pvalue.match(/lte=(\d+)([dMyw])/)
            ptype = 'lt'
            if (m) {
                document.getElementById('datepicker_lti').value = m[1]
                var sel = document.getElementById('datepicker_lts')
                for (var i in sel.options) {
                    if (parseInt(i) >= 0) {
                        if (sel.options[i].value == m[2]) {
                            sel.options[i].selected = "selected"
                        } else {
                            sel.options[i].selected = null
                        }
                    }
                }
            }
            
        }
        
        // More than N units ago?
        if (pvalue.match(/gte/)) {
            ptype = 'mt'
            var m = pvalue.match(/gte=(\d+)([dMyw])/)
            if (m) {
                document.getElementById('datepicker_mti').value = m[1]
                var sel = document.getElementById('datepicker_mts')
                // Go through the unit values, select the one we use
                for (var i in sel.options) {
                    if (parseInt(i) >= 0) {
                        if (sel.options[i].value == m[2]) {
                            sel.options[i].selected = "selected"
                        } else {
                            sel.options[i].selected = null
                        }
                    }
                }
            }
        }
        
        // Date range?
        if (pvalue.match(/dfr/)) {
            ptype = 'cd'
            // Make sure we have both a dfr and a dto here, catch them
            var mf = pvalue.match(/dfr=(\d+-\d+-\d+)/)
            var mt = pvalue.match(/dto=(\d+-\d+-\d+)/)
            if (mf && mt) {
                // easy peasy, just set two text fields!
                document.getElementById('datepicker_cfrom').value = mf[1]
                document.getElementById('datepicker_cto').value = mt[1]
            }
        }
        // Month??
        if (pvalue.match(/(\d{4})-(\d+)/)) {
            ptype = 'cd'
            // Make sure we have both a dfr and a dto here, catch them
            var m = pvalue.match(/(\d{4})-(\d+)/)
            if (m.length == 3) {
                // easy peasy, just set two text fields!
                var dfrom = new Date(parseInt(m[1]),parseInt(m[2])-1,1, 0, 0, 0)
                var dto = new Date(parseInt(m[1]),parseInt(m[2]),0, 23, 59, 59)
                document.getElementById('datepicker_cfrom').value = m[0] + "-" + dfrom.getDate()
                document.getElementById('datepicker_cto').value = m[0] + "-" + dto.getDate()
            }
        }
        calcTimespan(ptype)
    }
}


function datePickerValue(seedPeriod) {
    // This is for recalcing the set options if spawned from a
    // select/input box with an existing value derived from an
    // earlier call to datePicker
    var ptype = ""
    var rv = seedPeriod
    if (seedPeriod && seedPeriod.search && seedPeriod.search(/=|-/) != -1) {
        
        // Less than N units ago?
        if (seedPeriod.match(/lte/)) {
            var m = seedPeriod.match(/lte=(\d+)([dMyw])/)
            ptype = 'lt'
            var unitt = units[m[2]]
            if (parseInt(m[1]) != 1) {
                unitt += "s"
            }
            rv = "Less than " + m[1] + " " + unitt + " ago"
        }
        
        // More than N units ago?
        if (seedPeriod.match(/gte/)) {
            ptype = 'mt'
            var m = seedPeriod.match(/gte=(\d+)([dMyw])/)
            var unitt = units[m[2]]
            if (parseInt(m[1]) != 1) {
                unitt += "s"
            }
            rv = "More than " + m[1] + " " + unitt + " ago"
        }
        
        // Date range?
        if (seedPeriod.match(/dfr/)) {
            ptype = 'cd'
            var mf = seedPeriod.match(/dfr=(\d+-\d+-\d+)/)
            var mt = seedPeriod.match(/dto=(\d+-\d+-\d+)/)
            if (mf && mt) {
                rv = "From " + mf[1] + " to " + mt[1]
            }
        }
        
        // Month??
        if (seedPeriod.match(/^(\d+)-(\d+)$/)) {
            ptype = 'mr' // just a made up thing...(month range)
            var mr = seedPeriod.match(/(\d+)-(\d+)/)
            if (mr) {
                dfrom = new Date(parseInt(mr[1]),parseInt(mr[2])-1,1, 0, 0, 0)
                rv = months[dfrom.getMonth()] + ', ' + mr[1]
            }
        }
        
    }
    return rv
}

function datePickerDouble(seedPeriod) {
    // This basically takes a date-arg and doubles it backwards
    // so >=3M becomes =>6M etc. Also returns the cutoff for
    // the original date and the span in days of the original
    var ptype = ""
    var rv = seedPeriod
    var dbl = seedPeriod
    var tspan = 1
    var dfrom = new Date()
    var dto = new Date()
    
    // datepicker range?
    if (seedPeriod && seedPeriod.search && seedPeriod.search(/=/) != -1) {
        
        // Less than N units ago?
        if (seedPeriod.match(/lte/)) {
            var m = seedPeriod.match(/lte=(\d+)([dMyw])/)
            ptype = 'lt'
            rv = "<" + m[1] + m[2] + " ago"
            dbl = "lte=" + (parseInt(m[1])*2) + m[2]
            
            // N months ago
            if (m[2] == "M") {
                dfrom.setMonth(dfrom.getMonth()-parseInt(m[1]), dfrom.getDate())
            }
            
            // N days ago
            if (m[2] == "d") {
                dfrom.setDate(dfrom.getDate()-parseInt(m[1]))
            }
            
            // N years ago
            if (m[2] == "y") {
                dfrom.setYear(dfrom.getFullYear()-parseInt(m[1]))
            }
            
            // N weeks ago
            if (m[2] == "w") {
                dfrom.setDate(dfrom.getDate()-(parseInt(m[1])*7))
            }
            
            // Calc total duration in days for this time span
            tspan = parseInt((dto.getTime() - dfrom.getTime() + 5000) / (1000*86400))
        }
        
        // More than N units ago?
        if (seedPeriod.match(/gte/)) {
            ptype = 'mt'
            var m = seedPeriod.match(/gte=(\d+)([dMyw])/)
            rv = ">" + m[1] + m[2] + " ago"
            dbl = "gte=" + (parseInt(m[1])*2) + m[2]
            tspan = parseInt(parseInt(m[1]) * 30.4)
            dfrom = null
            
            // Months
            if (m[2] == "M") {
                dto.setMonth(dto.getMonth()-parseInt(m[1]), dto.getDate())
            }
            
            // Days
            if (m[2] == "d") {
                dto.setDate(dto.getDate()-parseInt(m[1]))
            }
            
            // Years
            if (m[2] == "y") {
                dto.setYear(dto.getFullYear()-parseInt(m[1]))
            }
            
            // Weeks
            if (m[2] == "w") {
                dto.setDate(dto.getDate()-(parseInt(m[1])*7))
            }
            
            // Can't really figure out a timespan for this, so...null!
            // This also sort of invalidates use on the trend page, but meh..
            tspan = null
        }
        
        // Date range?
        if (seedPeriod.match(/dfr/)) {
            ptype = 'cd'
            // Find from and to
            var mf = seedPeriod.match(/dfr=(\d+)-(\d+)-(\d+)/)
            var mt = seedPeriod.match(/dto=(\d+)-(\d+)-(\d+)/)
            if (mf && mt) {
                rv = "from " + mf[1] + " to " + mt[1]
                // Starts at 00:00:00 on from date
                dfrom = new Date(parseInt(mf[1]),parseInt(mf[2])-1,parseInt(mf[3]), 0, 0, 0)
                
                // Ends at 23:59:59 on to date
                dto = new Date(parseInt(mt[1]),parseInt(mt[2])-1,parseInt(mt[3]), 23, 59, 59)
                
                // Get duration in days, add 5 seconds to we can floor the value and get an integer
                tspan = parseInt((dto.getTime() - dfrom.getTime() + 5000) / (1000*86400))
                
                // double the distance
                var dpast = new Date(dfrom)
                dpast.setDate(dpast.getDate() - tspan)
                dbl = seedPeriod.replace(/dfr=[^|]+/, "dfr=" + (dpast.getFullYear()) + '-' + (dpast.getMonth()+1) + '-' + dpast.getDate())
            } else {
                tspan = 0
            }
        }
    }
    
    // just N days?
    else if (parseInt(seedPeriod).toString() == seedPeriod.toString()) {
        tspan = parseInt(seedPeriod)
        dfrom.setDate(dfrom.getDate() - tspan)
        dbl = "lte=" + (tspan*2) + "d"
    }
    
    // Specific month?
    else if (seedPeriod.match(/^(\d+)-(\d+)$/)) {
        // just a made up thing...(month range)
        ptype = 'mr' 
        var mr = seedPeriod.match(/(\d+)-(\d+)/)
        if (mr) {
            rv = seedPeriod
            // Same as before, start at 00:00:00
            dfrom = new Date(parseInt(mr[1]),parseInt(mr[2])-1,1, 0, 0, 0)
            // end at 23:59:59
            dto = new Date(parseInt(mr[1]),parseInt(mr[2]),0, 23, 59, 59)
            
            // B-A, add 5 seconds so we can floor the no. of days into an integer neatly
            tspan = parseInt((dto.getTime() - dfrom.getTime() + 5000) / (1000*86400))
            
            // Double timespan
            var dpast = new Date(dfrom)
            dpast.setDate(dpast.getDate() - tspan)
            dbl = "dfr=" + (dpast.getFullYear()) + '-' + (dpast.getMonth()+1) + '-' + dpast.getDate() + "|dto=" + (dto.getFullYear()) + '-' + (dto.getMonth()+1) + '-' + dto.getDate()
        } else {
            tspan = 0
        }
    }
    
    return [dbl, dfrom, dto, tspan]
}

// set date in caller and hide datepicker again.
function setDatepickerDate() {
    calcTimespan()
    blurDatePicker()
}

// findParent: traverse DOM and see if we can find a parent to 'el'
// called 'name'. This is used for figuring out whether 'el' has
// lost focus or not.
function findParent(el, name) {
    if (el.getAttribute && el.getAttribute("id") == name) {
        return true
    }
    if (el.parentNode && el.parentNode.getAttribute) {
        if (el.parentNode.getAttribute("id") != name) {
            return findParent(el.parentNode, name)
        } else {
            return true
        }
    } else {
        return false;
    }
}

// function for hiding the date picker
function blurDatePicker(evt) {
    var es = evt ? (evt.target || evt.srcElement) : null;
    if ((!es || !es.parentNode || (!findParent(es, "datepicker_popup") && !findParent(es, "calendarpicker_popup"))) && !(es ? es : "null").toString().match(/javascript:void/)) {
        document.getElementById('datepicker_popup').style.display = "none"
        $('html').trigger('hide.bs.dropdown')
    }
}

// draws the actual calendar inside a calendarPicker object
function drawCalendarPicker(obj, date) {
    
    
    obj.focus()
    
    // Default to NOW for calendar.
    var now = new Date()
    
    // if called with an existing date (YYYY-MM-DD),
    // convert it to a JS date object and use that for
    // rendering the calendar
    if (date) {
        var ar = date.split(/-/)
        now = new Date(ar[0],parseInt(ar[1])-1,ar[2])
    }
    var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    var mat = now
    
    // Go to first day of the month
    mat.setDate(1)
    
    obj.innerHTML = "<h3>" + months[mat.getMonth()] + ", " + mat.getFullYear() + ":</h3>"
    var tm = mat.getMonth()
    
    // -- Nav buttons --
    
    // back-a-year button
    var a = document.createElement('a')
    fixupPicker(a)
    a.setAttribute("onclick", "drawCalendarPicker(this.parentNode, '" + (mat.getFullYear()-1) + '-' + (mat.getMonth()+1) + '-' + mat.getDate() + "');")
    a.setAttribute("href", "javascript:void(0);")
    a.innerHTML = "≪"
    obj.appendChild(a)
    
    // back-a-month button
    a = document.createElement('a')
    fixupPicker(a)
    a.setAttribute("onclick", "drawCalendarPicker(this.parentNode, '" + mat.getFullYear() + '-' + (mat.getMonth()) + '-' + mat.getDate() + "');")
    a.setAttribute("href", "javascript:void(0);")
    a.innerHTML = "&lt;"
    obj.appendChild(a)
    
    // forward-a-month button
    a = document.createElement('a')
    fixupPicker(a)
    a.setAttribute("onclick", "drawCalendarPicker(this.parentNode, '" + mat.getFullYear() + '-' + (mat.getMonth()+2) + '-' + mat.getDate() + "');")
    a.setAttribute("href", "javascript:void(0);")
    a.innerHTML = "&gt;"
    obj.appendChild(a)
    
    // forward-a-year button
    a = document.createElement('a')
    fixupPicker(a)
    a.setAttribute("onclick", "drawCalendarPicker(this.parentNode, '" + (mat.getFullYear()+1) + '-' + (mat.getMonth()+1) + '-' + mat.getDate() + "');")
    a.setAttribute("href", "javascript:void(0);")
    a.innerHTML = "≫"
    obj.appendChild(a)
    obj.appendChild(document.createElement('br'))
    
    
    // Table containing the dates of the selected month
    var table = document.createElement('table')
    
    table.setAttribute("border", "1")
    table.style.margin = "0 auto"
    
    // Add header day names
    var tr = document.createElement('tr');
    for (var m = 0; m < 7; m++) {
        var td = document.createElement('th')
        td.innerHTML = days[m]
        tr.appendChild(td)
    }
    table.appendChild(tr)
    
    // Until we hit the first day in a month, add blank days
    tr = document.createElement('tr');
    var weekday = mat.getDay()
    if (weekday == 0) {
        weekday = 7
    }
    weekday--;
    for (var i = 0; i < weekday; i++) {
        var td = document.createElement('td')
        tr.appendChild(td)
    }
    
    // While still in this month, add day then increment date by 1 day.
    while (mat.getMonth() == tm) {
        weekday = mat.getDay()
        if (weekday == 0) {
            weekday = 7
        }
        weekday--;
        if (weekday == 0) {
            table.appendChild(tr)
            tr = document.createElement('tr');
        }
        td = document.createElement('td')
        // onclick for setting the calendarPicker's parent to this val.
        td.setAttribute("onclick", "setCalendarDate('" + mat.getFullYear() + '-' + (mat.getMonth()+1) + '-' + mat.getDate() + "');")
        td.innerHTML = mat.getDate()
        mat.setDate(mat.getDate()+1)
        tr.appendChild(td)
    }
    
    table.appendChild(tr)
    obj.appendChild(table)
}

// callback for datePicker; sets the cd value to what date was picked
function setCalendarDate(what) {
    $('html').on('hide.bs.dropdown', function (e) {
        return false;
    });
    setTimeout(function() { $('html').unbind('hide.bs.dropdown');}, 250);
    
    
    calendarpicker_spawner.value = what
    var div = document.getElementById('calendarpicker_popup')
    div.parentNode.focus()
    div.style.display = "none"
    calcTimespan('cd')
}

// caller for when someone clicks on a calendarPicker enabled field
function showCalendarPicker(parent, seedDate) {
    calendarpicker_spawner = parent
    
    // If supplied with a YYYY-MM-DD date, use this to seed the calendar
    if (!seedDate) {
        var m = parent.value.match(/(\d+-\d+(-\d+)?)/)
        if (m) {
            seedDate = m[1]
        }
    }
    
    // Show or create the calendar object
    var div = document.getElementById('calendarpicker_popup')
    if (!div) {
        div = document.createElement('div')
        div.setAttribute("id", "calendarpicker_popup")
        div.setAttribute("class", "calendarpicker")
        document.getElementById('datepicker_popup').appendChild(div)
        div.innerHTML = "Calendar goes here..."
    }
    div.style.display = "block"
    var bb = parent.getBoundingClientRect()
    
    // Align with the calling object, slightly below
    div.style.top = (bb.bottom + 8) + "px"
    div.style.left = (bb.right - 32) + "px"
    
    drawCalendarPicker(div, seedDate)    
}

/******************************************
 Fetched from source/drafts.js
******************************************/

// Draft saving/loading features

let saved_drafts = null;

function save_draft() {
    js = {
        'project': project,
        'action': 'save',
        'type': editor_type,
        'report': JSON.stringify(report),
        'report_compiled': compile_report(null, true, true)
    }
    
    let formdata = $.param(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Saving draft...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    
    POST('drafts.py', draft_saved, {}, formdata);
}

function draft_saved(state, json) {
    // Disengage spinner
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    
    if (json.filename) {
        modal("Draft was saved in the reporter database as <kbd>%s</kbd>. You can revisit this draft at any time by loading it from the base data tab. Drafts are kept for up to two months.".format(json.filename));
    } else {
        modal("Could not save draft: %s".format(json.error || "Unspecified error"));
    }
}


function load_draft(filename) {
    GET('drafts.py?action=fetch&project=%s&filename=%s&type=%s'.format(project, filename, editor_type), read_draft, {});
}

function read_draft(state, json) {
    if (json.report) {
        
        if (editor_type == 'unified') {
          document.getElementById('unified-report').value = json.report;
          window.setTimeout(() => { $('#unified-report').highlightWithinTextarea('update'); }, 250);
        } else {
            report = json.report;
        }
        build_steps(0, true, true);
        modal("Draft was successfully loaded and is ready.");
    } else {
        modal("Could not load report draft :/");
    }
}



function list_drafts() {
  if (!saved_drafts) {
    GET('drafts.py?action=index&project=%s&type=%s'.format(project, editor_type), show_draft_list, {});
    return "";
  }
  else {
    return show_draft_list();
  }
}

function show_draft_list(state, json) {
  if (json && json) { saved_drafts = json.drafts || {}; }
  
  let txt = "";
  let filenames = Object.keys(saved_drafts);
  if (filenames.length > 0) {
    txt += "<h6>Found the following saved drafts for %s:</h6>".format(project);
    txt += "<small style='font-size: 0.75rem;'><ul style='margin: 0px; padding: 10px;'>"
    filenames.sort();
    for (var i = filenames.length -1; i >= 0; i--) {
        let ts = filenames[i];
        let del = ''
        if (saved_drafts[ts].yours) {
             del = "<button class='btn btn-danger btn-sm' style='margin-left: 8px;' onclick='javascript:delete_draft(\"%s\");'>Delete</button>".format(saved_drafts[ts].filename);
        }
        let shortname = saved_drafts[ts].filename.replace(/[^-]+-[^-]+-/, '').replace('.json', ''); // don't need to show the full filename really
        txt += "<li>%s saved %s<button class='btn btn-info btn-sm' style='margin-left: 6px;' onclick='javascript:load_draft(\"%s\");'>Load</button> %s</li>".format(shortname, moment(parseInt(ts)*1000.0).fromNow(), saved_drafts[ts].filename, del);
    }
    txt += "</ul></small>"
  }
  if (json && current_step == 0) {
    let tip = document.getElementById('tips');
    if (txt.length > 0) {
        tip.style.display = 'block';
        tip.innerHTML = txt;
    } else {
        tip.style.display = 'none';
    }
    if (editor_type == 'unified') {
        let tip = document.getElementById('unified-helper');
        tip.innerHTML += txt;
    }
  } else {
    return txt;
  }
}



function delete_draft(filename) {
    GET('drafts.py?action=delete&project=%s&filename=%s'.format(project, filename), deleted_draft, {filename: filename});
}

function deleted_draft(state, json) {
    if (json.message) {
        modal("Draft was successfully removed.");
        let filenames = Object.keys(saved_drafts);
        for (var i = 0; i < filenames.length; i++) {
            let ts = filenames[i];
            let fn = saved_drafts[ts].filename;
            if (fn == state.filename) {
                delete saved_drafts[ts];
                break
            }
        }
        show_draft_list({}, {drafts: saved_drafts});
    } else {
        modal("Could not remove report draft :/");
    }
}


/******************************************
 Fetched from source/generators.js
******************************************/

// Least common multiple
let lcm = (x, y) => (!x || !y) ? 0 : Math.abs((x * y) / gcd(x, y));

// Greatest common divisor
let gcd = (x,y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    let t = y;
    y = x % y;
    x = t;
  }
  return x;
}


function generate_pmc_roster(data) {
    
    // PMC age
    let founded = moment(data.pmcdates[project].pmc[2] * 1000.0);
    let age = founded.fromNow();
    let txt = "%s was founded %s (%s)\n".format(data.pmcsummary[project].name, founded.format('YYYY-MM-DD'), age);
    
    // PMC and committer count
    let no_com = data.count[project][1];
    let no_pmc = data.count[project][0];
    
    let y1 = no_com;
    let y2 = no_pmc;
    while (y1 > 20) {
        y1 = Math.round(y1/2)
        y2 = Math.round(y2/2);
    }
    l = lcm(y1, y2);
    x1 = l/y2;
    x2 = l/y1;
    while (x1 >= 10) {
        x1 /= 1.25;
        x2 /= 1.25;
    }
    x1 = Math.round(x1)
    x2 = Math.round(x2)
    
    while ((x1/x2) == Math.floor(x1/x2) && x2 > 1) {
        let k = (x1/x2)
        x1 /= k
        x2 /= k
    }
    
    txt += "There are currently %u committers and %u PMC members in this project.\nThe Committer-to-PMC ratio is %u:%u.\n\n".format(no_com, no_pmc, x1, x2);
    
    
    
    // Last PMC addition
    let changes = data.changes[project].pmc;
    let now = moment();
    let three_months_ago = now.subtract(3, 'months');
    let no_added = 0;
    let last_added = null;
    txt += "PMC changes, past quarter:\n";
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1]*1000.0);
        if (!last_added || last_added[1] < change[1])  {
            last_added = change;
        }
        if (added.isAfter(three_months_ago)) {
            no_added++;
            txt += "- %s was added to the PMC on %s\n".format(name, added.format('YYYY-MM-DD'));
        }
    }
    
    if (!no_added) {
        txt += "- No new PMC members added in the past quarter.\n";
        if (last_added) {
            txt += "- Last PMC addition was %s on %s.\n".format(last_added[0], moment(last_added[1]*1000.0).format('YYYY-MM-DD'));
        }
    }
    
    // Last Committer addition
    txt += "\n"
    txt += "Committership changes, past quarter:\n"
    changes = data.changes[project].committer;
    now = moment();
    three_months_ago = now.subtract(3, 'months');
    no_added = 0;
    last_added = null;
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1]*1000.0);
        if (!last_added || last_added[1] < change[1])  {
            last_added = change;
        }
        if (added.isAfter(three_months_ago)) {
            no_added++;
            txt += "- %s was added as committer on %s\n".format(name, added.format('YYYY-MM-DD'));
        }
    }
    
    if (!no_added) {
        txt += "- No new committers added in the past quarter.\n";
        if (last_added) {
            txt += "- Last committer addition was %s on %s.\n".format(last_added[0], moment(last_added[1]*1000.0).format('YYYY-MM-DD'));
        }
    }
    
    return txt;
}

function generate_meta(data) {
    let founded = moment(data.pmcdates[project].pmc[2] * 1000.0);
    let age = founded.fromNow();
    let txt = "<b>Founded: </b>%s (%s)<br/>".format(founded.format('YYYY-MM-DD'), age);
    txt += "<b>Chair: </b> %s<br/>".format(data.pdata[project].chair);
    txt += getReportDate(cycles, project);
    
    // Previous comments of note?
    let cdates = Object.keys(comments.comments);
    cdates.sort();
    if (comments && cdates.length > 0) {
      let date = cdates[cdates.length-1];
      let comment = comments.comments[date];
      
      // split and rejoin comments
      let ntxt = "";
      let a = comment.match(/([a-z0-9]+: [\s\S\r\n]+?)(?=([a-z0-9]+:|$))/gi);
      if (a) {
        for (var i = 0; i < a.length; i++) {
          let cmt = a[i];
          cmt = cmt.replace(/[\r\n]+/g, ' ').replace(/([a-z0-9]+:)/, (a) => "<kbd>"+a+"</kbd><br/>");
          ntxt += cmt + "<hr/>";
        }
      }
      txt += "<hr/><h6>Last report comments from the board: </h6>";
      txt += "<b style='color: #369;'>%s:</b><br/><span style='white-space: wrap; font-size: 0.8rem;'>%s</span>".format(date, ntxt);
    }
    return txt;
}


function pre_splash(state, json) {
    cycles = json;
    GET("/getjson.py", splash, {});
}

function splash(state, json, all) {
    pdata = json;
    let html = document.body;
    html.style.margin = '16px';
    let link = all ? 'All projects (<a href="javascript:splash({}, pdata, false);">show only your projects</a>):' : 'Your projects (<a href="javascript:splash({}, pdata, true);">show all projects</a>):'
    html.innerHTML = '<h3>%s</h3>'.format(link);
    let tbl = new HTML('table', {cellpadding: '8px', style: {margin: '20px'}});
    let hdr = new HTML('tr', {style: {color: "#963"}})
    hdr.inject([
        new HTML('td', {}, "Project:"),
        new HTML('td', {}, "Chair:"),
        new HTML('td', {}, "Next report date:"),
        new HTML('td', {}, "Wizard link:")
    ])
    tbl.inject(hdr);
    let keys = json.pdata;
    if (all) keys = cycles;
    let found = 0;
    for (var key in keys) {
        found++;
        if (pdata.pmcsummary[key]) {
            let tlpname = pdata.pmcsummary[key].name;
            let chair = pdata.pmcsummary[key].chair;
            let ccolor = '#000';
            if (chair == pdata.you.name) {
                chair += " (You!)";
                ccolor = '#195';
            }
            let tr = new HTML('tr');
            let rd = new HTML('td', {}, getReportDate(cycles, key, true));
            let link = new HTML('td', {}, new HTML('a', {href: '?%s'.format(key)}, "Wizard for %s".format(tlpname)));
            let title = new HTML('td', {}, new HTML('b', {}, tlpname));
            let cname = new HTML('td', {style: {color: ccolor}}, new HTML('b', {}, chair));
            tr.inject([title, cname, rd, link])
            tbl.inject(tr);
        }
    }
    if (!found) {
        let tr = new HTML('tr', {}, new HTML('td', {colspan: 4}, "It doesn't look like you are on any PMCs"));
        tbl.inject(tr);
    }
    html.inject(tbl);
    
}

function health_tips(data) {
    let txt = "";    
    // Mailing list changes
    for (var ml in data.delivery[project]) {
        let mldata = data.delivery[project][ml];
        let a = ml.split('-', 2);
        ml = "%s@%s.apache.org".format(a[1], a[0]);
        let pct_change =Math.floor( 100 * ( (mldata.quarterly[0] - mldata.quarterly[1]) / (mldata.quarterly[1]*1.0) ));
        let pct_change_txt = "%u%".format(pct_change);
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        if (pct_change > 25 && mldata.quarterly[0] > 5) {
            txt += "<li style='color: #080'>%s had a %s increase in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
        else if (pct_change < -25  && mldata.quarterly[1] > 5) {
            pct_change = Math.abs(pct_change)
            txt += "<li style='color: #800'>%s had a %s decrease in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
    }
    
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "<li>%u BugZilla tickets opened and %u closed in the past quarter.</li>".format(bz[0], bz[1]);
    
    // JIRA changes
    let jira = data.jira[project];
    if (jira[0] || jira[1]) txt += "<li>%u JIRA tickets opened and %u closed in the past quarter.</li>".format(jira[0], jira[1]);
    
    // Append header IF there is data, otherwise nah.
    if (txt.length > 0) txt = "<hr/><big>Potentially useful observations on community health:</big><ul>" + txt + "</ul>";
    return txt;
}

let compile_okay = false;

function check_compile(data) {
    
    compile_okay = true;
    let text = "";
    if (editor_type == 'unified') {
      let required_sections = [];
      let sections = parse_unified();
      
      for (var i = 0; i < step_json.length; i++) {
        let step = step_json[i];
        if (!step.noinput) {
          let found = false;
          required_sections.push(step.description);
          for (var n = 0; n < sections.length; n++) {
            if (sections[n].title == step.description) {
              found = true;
              if (sections[n].text.indexOf(PLACEHOLDER) != -1) {
                console.log("Found placeholder text: " + PLACEHOLDER)
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> contains placeholder text!</li>".format(step.description);
                compile_okay = false;
              } else if (sections[n].text.length < 20) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> <kbd>%s</kbd> seems a tad short?</li>".format(step.description);
              } else {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: green;'>&#x2713;</span> <kbd>%s</kbd> seems alright</li>".format(step.description);
                
              }
              break;
            }
          }
          if (!found) {
            compile_okay = false;
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> is missing from the report!</li>".format(step.description);
          }
        }
        
      }
      
      // Remark on additional sections not required
      for (var n = 0; n < sections.length; n++) {
          if (!required_sections.has(sections[n].title)) {
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> Found unknown section <kbd>%s</kbd></li>".format(sections[n].title);
          }
      }
      
      
    }
    else {
      for (var i = 1; i < 5; i++) {
          if (report[i] == null || report[i].length == 0) {
              text += "<li>You have not filled out the <kbd>%s</kbd> section yet.".format(step_json[i].description);
              compile_okay = false;
          }
      }
    }
    
    if (text.length > 0) {
        text = "<h5>Report review results:</h5>The following remarks were logged by the report compiler:<br/><ul>" + text + "</ul>";
    }
    if (!compile_okay) {
      text += "Your report could possibly use some more work, and that's okay! You can always save your current report as a draft and return later to work more on it. Drafts are saved for up to two months.";
    }
    else {
        text += "That's it, your board report compiled a-okay and is potentially ready for submission! If you'd like more time to work on it, you can save it as a draft, and return later to make some final edits. Or you can publish it to the agenda via Whimsy.";
    }
    text += "<br/><button class='btn btn-warning' onclick='save_draft();'>Save as draft</button>"
    if (compile_okay) text += " &nbsp; &nbsp; <button class='btn btn-success'>Publish via Whimsy</button>"
    return text;
}


function compile_report(data, okay, force) {
    if (!okay && !force) return -1
    if (editor_type == 'unified') {
      return document.getElementById('unified-report').value;
    }
    let rep = "## Board Report for %s ##\n".format(pdata.pdata[project].name);
    for (var i = 1; i < 5; i++) {
        let step = step_json[i];
        rep += "\n## %s:\n".format(step.description);
        if (report[i] !== null) {
            rep += report[i].replace(/(\r?\n)+$/, '');
        } else {
            rep += "Nothing entered yet...\n";
        }
        rep += "\n";
    }
    return rep;
}

function activity_tips(data) {
    let three_months_ago = moment().subtract(3, 'months');
    let txt = "";
    
    // Releases
    let rtxt = "";
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago) {
            rtxt += "<li>%s was released on %s.</li>".format(rel, reldate.format('YYYY-MM-DD'));
        }
    }
    if (rtxt != '') {
        rtxt = "<h6>Releases this quarter: </h6><ul>" + rtxt + "</ul>";
    }
    
    
    // Put it all together
    txt += rtxt;
    if (txt) txt = "<h5>Potentially useful data I found:</h5>" + txt
    return txt;
}



/******************************************
 Fetched from source/init.js
******************************************/

console.log("/******* ASF Board Report Wizard initializing ********/")
// Adjust titles:
let project = location.search.substr(1);
let loaded_from_draft = false;
let PLACEHOLDER = '[Insert your own data here]';

if (project.length < 2) {
    GET("/reportingcycles.json", pre_splash, {});
} else {
    document.title = "ASF Board Report Wizard: %s".format(project);
    let titles = document.getElementsByClassName("title");
    for (var i in titles) {
        titles[i].innerText = document.title;
    }
    
    if (editor_type == 'unified') {
        console.log("Using unified editor!");
        document.getElementById('wrapper').setAttribute('class', 'unified');
    }
    console.log("Initializing escrow checks");
    window.setInterval(escrow_check, 250);
    
    GET("/getjson.py?only=%s&anon=true".format(project), prime_wizard, {});
}

/******************************************
 Fetched from source/primer.js
******************************************/

let pdata = {};
let report = [null,null,null,null,null,null];
let current_step = 0;
let cycles = {};
let draft_mode = false;
let comments = {};

function modal(txt) {
    document.getElementById('alert_text').innerHTML = txt;
    $("#alert").modal();
}

function prime_wizard(state, json) {
    // Adjust title(s)
    if (!json.pdata[project]) {
        modal("Could not find project data for %s!".format(project));
        return;
    }
    pdata = json;
    document.title = "ASF Board Report Wizard: %s".format(json.pdata[project].name);
    let titles = document.getElementsByClassName("title");
    for (var i in titles) {
        titles[i].innerText = document.title;
    }
    
    let xtitle = document.getElementById("pname");
    xtitle.innerText = document.title;
    GET("comments.py?project=%s".format(project), prime_comments, {})
}

function prime_comments(state, json) {
    comments = json;
    GET("/reportingcycles.json", prime_cycles, {})
}

function prime_cycles(state, json) {
    cycles = json;
    GET("steps.json?" + Math.random(), prime_steps, {});
}


let step_json = {};
function prime_steps(state, json) {
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    step_json = json.steps;
    build_steps(0, true);
}

let hilite_timer = null;

function build_steps(s, start, noclick, e) {
    s = s || 0;
    
    let text = document.getElementById('step_text');
    if (!start && text && text.value.length > 0 && current_step < 5) {
        report[current_step] = text.value;
    }
   
    text.innerText = '';
    let step_changed = (s == current_step) ? false : true;
    current_step = s;
    
    let stepParent = document.getElementById('steps');
    stepParent.innerHTML = '';
    for (var i = 0; i < step_json.length; i++) {
        let element = step_json[i];
        let wrapper = new HTML('div', {class: 'wizard-step-wrapper', onclick: 'build_steps(%u);'.format(i)});
        let stepcircle = new HTML('div', {class: 'wizard-step'});
        let stepicon = new HTML('i', {class: 'fas fa-%s'.format(element.icon)});
        stepcircle.inject(stepicon);
        let steptext = new HTML('div', {class: 'wizard-step-text'}, element.description);
        wrapper.inject([stepcircle, steptext]);
        if (s == i) {
            stepcircle.setAttribute('class', 'wizard-step active');
            steptext.setAttribute('class', 'wizard-step-text active');
        }
        if (i < s) {
            stepcircle.setAttribute('class', 'wizard-step done');
            steptext.setAttribute('class', 'wizard-step-text done');
        }
        stepParent.inject(wrapper);
        if (i < step_json.length-1) {
            let line = new HTML('div', {class: 'wizard-line'});
            if (i < s) line.setAttribute('class', 'wizard-line done');
            stepParent.inject(line);
        }
        if (s == i) {
            let title = document.getElementById('step_title');
            title.innerText = element.description;
            let help = document.getElementById('step_help');
            help.innerHTML = element.help || "No helper information available for this step...";
            if (element.helpgenerator) {
                let data = eval("%s(pdata);".format(element.helpgenerator));
                help.innerHTML = data;
            }
            let text = document.getElementById('step_text');
            text.placeholder = element.placeholder || "";
            let hw = document.getElementById('help_wrapper');
            if (element.noinput) {
                text.style.display = 'none';
            }
            else text.style.display = 'inline';
            text.style.height = (395 - hw.scrollHeight) + "px";
            if (element.generator && !(report[s] && report[s].length > 0)) {
                let data = eval("%s(pdata, compile_okay);".format(element.generator));
                if (data === -1) text.style.display = 'none'; // hide if generator return -1
                else text.value = data;
            }
            else if (report[s]) {
                text.value = report[s];
            } else {
                text.value = '';
            }
            
            // tips??
            let tip = document.getElementById('tips');
            if (element.tipgenerator) {
                let data = eval("%s(pdata);".format(element.tipgenerator));
                if (data && data.length > 0) {
                    tip.innerHTML = data;
                    tip.style.display = 'block';
                } else {
                    tip.style.display = 'none';
                }
            } else {
                tip.style.display = 'none';
            }
        }
    }
    
    let bp = document.getElementById('step_prev');
    if (s == 0) bp.style.display = 'none';
    else bp.style.display = 'block';
    
    let bn = document.getElementById('step_next');
    if (s == step_json.length -1) bn.style.display = 'none';
    else bn.style.display = 'block';
    
    if (editor_type == 'unified') {
        if (start) {
            let template = "";
            for (var i = 0; i < step_json.length; i++) {
                let step = step_json[i];
                if (!step.noinput) {
                    template += "## %s:\n".format(step.description);
                    if (step.generator) {
                        let data = eval("%s(pdata);".format(step.generator));
                        if (data && data.length > 0) template += data
                    } else {
                        template += PLACEHOLDER;
                    }
                    template += "\n\n";
                }
            }
            document.getElementById('unified-report').value = template;
        }
        if (report_changed) hilite_sections();
        
        let step = step_json[s];
        let helper = document.getElementById('unified-helper');
        
        helper.innerHTML = "<h5>%s:</h5>".format(step.description);
        // Add in help
        if (step.helpgenerator) {
            let data = eval("%s(pdata);".format(step.helpgenerator));
            helper.innerHTML += data;
        } else if (step.help) {
            helper.innerHTML += step.help;
        }
        
        // Add tips?
        if (step.tipgenerator) {
            let data = eval("%s(pdata);".format(step.tipgenerator));
            helper.innerHTML += data;
        }
        // If clicked to a section, move cursor
        if (!noclick) {
            set_position(step.description);
        }
        if (step_changed || !noclick)  mark_section(step.description);
        else {
            window.clearTimeout(hilite_timer);
            if (event && event.keyCode == 13) mark_section(step.description);
            else hilite_timer = window.setTimeout(() => { mark_section(step.description)}, 200);
        }
    }
}



/******************************************
 Fetched from source/reportdate.js
******************************************/

// Grabbed from old reporter.a.o

// return all the Wednesdays in the month
function getWednesdays(mo, y) {
	var d = new Date();
	d.setFullYear(y, mo, 1)
	var month = d.getMonth(),
		wednesdays = [];

	// Get the first Wednesday (day 3 of week) in the month
	while (d.getDay() !== 3) {
		d.setDate(d.getDate() + 1);
	}

	// Get all the other Wednesdays in the month
	while (d.getMonth() === month) {
		wednesdays.push(new Date(d.getTime()));
		d.setDate(d.getDate() + 7);
	}

	return wednesdays;
}
// check if the entry is a wildcard month

function everyMonth(s) {
	if (s.indexOf('Next month') == 0) {
		return true
	}
	return s == 'Every month'
}

var m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Format the report month array. Assumes that non-month values appear first

function formatRm(array) {
    var first = array[0]
    if (array.length == 1) { // e.g. every month
        return first
    }
    if (m.indexOf(first) < 0) { // non-month value initially
        return  first.concat('; (default: ', array.slice(1).join(', '),')')
    }
    return array.join(', ')
}

// Called by: GetAsyncJSON("reportingcycles.json?" + Math.random(), [pmc, reportdate, json.pdata[pmc].name], setReportDate) 

function getReportDate(json, pmc, dateOnly) {
	var today = new Date()

	var dates = [] // the entries must be in date order
	if (!json[pmc]) {
		pmc = "Foo?"
	}

	var rm = json[pmc] // reporting months for the pmc

	// First check if the list contains an every month indicator
	// This is necessary to ensure that the dates are added to the list in order
	for (var i = 0; i < json[pmc].length; i++) {
		var sm = json[pmc][i];
		if (everyMonth(sm)) {
			rm = m // reset to every month
			break
		}
	}

    // Find the 3rd Wed in each month for this year
    var this_year = today.getFullYear();
	// Check the months in order, so it does not matter if the data is unordered
	for (var x = 0; x < m.length; x++) {
		for (var i = 0; i < rm.length; i++) {
			if (m[x] == rm[i]) {
				dates.push(getWednesdays(x, this_year)[2])
			}
		}
	}
	// Also for next year to allow for year-end wrap-round
	// cannot combine with the code above because that would destroy the order
	for (var x = 0; x < m.length; x++) {
		for (var i = 0; i < rm.length; i++) {
			if (m[x] == rm[i]) {
				dates.push(getWednesdays(x, this_year+1)[2])
			}
		}
	}
	// find the first Wed that has not been reached
	var nextdate = dates[0];
	while (nextdate < today && dates.length > 0) {
		nextdate = dates.shift();
	}
	if (dateOnly) return nextdate ? (nextdate.toDateString() + " ("  + moment(nextdate).fromNow() + ")"): "Unknown(?)";
	let txt = "";
	txt += "<b>Reporting schedule:</b> " + (json[pmc] ? formatRm(json[pmc]) : "Unknown(?)") + "<br>"
	txt += "<b>Next report date: " + (nextdate ? nextdate.toDateString() : "Unknown(?)") + "</b>"

	return txt
}


/******************************************
 Fetched from source/scaffolding-html.js
******************************************/

/**
 * HTML: DOM creator class
 * args:
 * - type: HTML element type (div, table, p etc) to produce
 * - params: hash of element params to add (class, style etc)
 * - children: optional child or children objects to insert into the new element
 * Example:
 * div = new HTML('div', {
 *    class: "footer",
 *    style: {
 *        fontWeight: "bold"
 *    }
#}, "Some text inside a div")
 */

var txt = (msg) => document.createTextNode(msg);

var HTML = (function() {
  function HTML(type, params, children) {

    /* create the raw element, or clone if passed an existing element */
    var child, j, len, val;
    if (typeof type === 'object') {
      this.element = type.cloneNode();
    } else {
      this.element = document.createElement(type);
    }

    /* If params have been passed, set them */
    if (isHash(params)) {
      for (var key in params) {
        val = params[key];

        /* Standard string value? */
        if (typeof val === "string" || typeof val === 'number') {
          this.element.setAttribute(key, val);
        } else if (isArray(val)) {

          /* Are we passing a list of data to set? concatenate then */
          this.element.setAttribute(key, val.join(" "));
        } else if (isHash(val)) {

          /* Are we trying to set multiple sub elements, like a style? */
          for (var subkey in val) {
            let subval = val[subkey];
            if (!this.element[key]) {
              throw "No such attribute, " + key + "!";
            }
            this.element[key][subkey] = subval;
          }
        }
      }
    }

    /* If any children have been passed, add them to the element */
    if (children) {

      /* If string, convert to textNode using txt() */
      if (typeof children === "string") {
        this.element.inject(txt(children));
      } else {

        /* If children is an array of elems, iterate and add */
        if (isArray(children)) {
          for (j = 0, len = children.length; j < len; j++) {
            child = children[j];

            /* String? Convert via txt() then */
            if (typeof child === "string") {
              this.element.inject(txt(child));
            } else {

              /* Plain element, add normally */
              this.element.inject(child);
            }
          }
        } else {

          /* Just a single element, add it */
          this.element.inject(children);
        }
      }
    }
    return this.element;
  }

  return HTML;

})();

/**
 * prototype injector for HTML elements:
 * Example: mydiv.inject(otherdiv)
 */

HTMLElement.prototype.inject = function(child) {
  var item, j, len;
  if (isArray(child)) {
    for (j = 0, len = child.length; j < len; j++) {
      item = child[j];
      if (typeof item === 'string') {
        item = txt(item);
      }
      this.appendChild(item);
    }
  } else {
    if (typeof child === 'string') {
      child = txt(child);
    }
    this.appendChild(child);
  }
  return child;
};



/**
 * prototype for emptying an html element
 */

HTMLElement.prototype.empty = function() {
  var ndiv;
  ndiv = this.cloneNode();
  this.parentNode.replaceChild(ndiv, this);
  return ndiv;
};

function toggleView(id) {
  let obj = document.getElementById(id);
  if (obj) {
    obj.style.display = (obj.style.display == 'block') ? 'none' : 'block';
  }
}


/******************************************
 Fetched from source/unified.js
******************************************/


function hilite_sections(b) {
    if (highlighted && !b) return;
    highlighted = true;
    let hilites = [];
    
    
    hilites.push({highlight: /^## [^\r\n]+:/mg, className: 'blue' });
    hilites.push({highlight: PLACEHOLDER, className: 'none' });
    
    let x = $('#unified-report').selectionStart;
    let y = $('#unified-report').selectionEnd;
        
    if (b) {
        $('#unified-report').highlightWithinTextarea('destroy');
        hilites.push({
            highlight: b,
            className: 'green'
            });
    }
    
    
    $('#unified-report').highlightWithinTextarea({
            highlight: hilites
        });
    if (x == y) {
        $('#unified-report').selectionStart = x;
        $('#unified-report').selectionEnd = y;
        $('#unified-report').focus();
    }
}


let report_unified = "";
let report_changed = true;
let highlighted = false;

function find_section(e) {
    let tmp = document.getElementById('unified-report').value;
    report_changed = (report_unified == tmp) ? false : true;
    report_unified = tmp;
    let spos = $('#unified-report').prop("selectionStart");
    let helper = document.getElementById('unified-helper');
    
    // Hop to next newline, so marking the title will jump to the right section
    while (report_unified[spos] != "\n" && spos < report_unified.length) spos++;
    
    let tprec = report_unified.substr(0, spos);
    let at_step = 0;
    for (var i = 1; i < step_json.length-1; i++) {
        let step = step_json[i];
        let tline = "## %s:".format(step.description);
        if (tprec.indexOf(tline) != -1) {
            at_step = i;
        }
    }
    
    if (at_step) {
        build_steps(at_step, false, true, e);
        
    } else {
        helper.innerText = "";
    }
}

function set_position(text) {
    let editor = document.getElementById('unified-report');
    let pos = editor.value.search(text);
    if (pos && pos > 0) {
        editor.selectionStart = (pos + text.length + 2);
        editor.selectionEnd = (pos + text.length + 2);
        editor.focus();
    }
}

// Parses a unified report into sections
function parse_unified(quiet) {
    let sections = [];
    let sX = 0;
    let tmp = document.getElementById('unified-report').value;
    while (tmp.length > 0) {
      let nextheader = tmp.match(/^## ([^\r\n]+)\r?\n/m);
      if (nextheader) {
        if (!quiet) console.log("Found report header: %s".format(nextheader[0]))
        let title = nextheader[1];
        let spos = tmp.indexOf(nextheader[0]);
        if (spos != -1) {
          sX += spos + nextheader[0].length;
          sY = sX;
          tmp = tmp.substr(spos + nextheader[0].length);
          let epos = tmp.search(/^## [^\r\n]+/m);
          epos = (epos == -1) ? tmp.length : epos;
          let section = tmp.substr(0, epos);
          if (title.length > 2) {
            sections.push({
              title: title.replace(/:.*$/, ''),
              text: section,
              start: sX,
              end: sX + epos
            });
          }
          if (!quiet) console.log("Section contains:");
          if (!quiet) console.log(section)
          tmp = tmp.substr(epos);
        } else { break }
      } else {
        if (!quiet) console.log("No more report headers found.");
      }
      
    }
    return sections;
}


// Mark a section using the highlighter
function mark_section(title) {
    let sections = parse_unified(true);
    let foundit = false;
    for (var i = 0; i < sections.length; i++) {
        if (sections[i].title == title && sections[i].text.indexOf(PLACEHOLDER) == -1 && sections[i].text.length > 4) {
            //console.log("Marking entire %s section from %u to %u".format(title, sections[i].start, sections[i].end))
            hilite_sections(sections[i].text);
            foundit = true;
            break
        }
    }
    if (!foundit) {
        hilite_sections("<-- EXTERMINATE -->");
    }
}