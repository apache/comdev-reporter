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
let draft_stepper = null;

function save_draft() {
    js = {
        'project': project,
        'action': 'save',
        'type': 'unified',
        'report': JSON.stringify(draft_stepper.editor.report),
        'report_compiled': draft_stepper.editor.report
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
        draft_stepper.editor.object.value = json.report;
        draft_stepper.editor.report = json.report;
        window.setTimeout(() => { draft_stepper.editor.highlight() }, 250);
        draft_stepper.build(0, false, false);
        modal("Draft was successfully loaded and is ready.");
    } else {
        modal("Could not load report draft :/");
    }
}


function list_drafts(pdata, editor) {
  if (!saved_drafts) {
    GET('drafts.py?action=index&project=%s&type=%s'.format(project, editor_type), show_draft_list, {stepper:editor.stepper});
    return "";
  }
  else {
    return show_draft_list({stepper: editor.stepper});
  }
}

function show_draft_list(state, json) {
  if (json && json) { saved_drafts = json.drafts || {}; }
  draft_stepper = state.stepper||drafts_stepper; // hackish for now!
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
  if (json && state.stepper.step == 0) {
    let tip = document.getElementById('unified-helper');
    tip.innerHTML += txt;
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
        draft_stepper.build(0, false);
    } else {
        modal("Could not remove report draft :/");
    }
}


function publish_report() {
    let agendafile = getReportDate(cycles, project, false, true);
    if (!window.confirm("This will publish your report to %s - are you sure?".format(agendafile))) {
      return;
    }
    let js = {
        'project': project,
        'agenda': agendafile,
        'report': draft_stepper.editor.report
    };
    
    let formdata = $.param(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Publishing report, hang on...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    
    POST('whimsy.py', report_published, {}, formdata);
}

function report_published(state, json) {
  // Disengage spinner
  document.getElementById('wizard_spinner').style.display = 'none';
  document.getElementById('wrapper').style.display = 'block';
  
  if (json && json.okay) {
    modal("Your report was successfully posted to the board agenda!");
  } else {
    modal("Something went wrong, and we couldn't publish your report.<br/>Please check with the Whimsy tool to see if there is already a report posted!");
  }
}

/******************************************
 Fetched from source/generators.js
******************************************/

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


function generate_pmc_roster(pdata) {
    // PMC age
    let founded = moment((pdata.pmcdates[project].pmc[2]||pdata.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();
    let txt = "%s was founded %s (%s)\n".format(pdata.pmcsummary[project].name, founded.format('YYYY-MM-DD'), age);
    
    // PMC and committer count
    let no_com = pdata.count[project][1];
    let no_pmc = pdata.count[project][0];
    
    let y1 = no_com;
    let y2 = no_pmc;
    let cpr = "";
    
    // See if we can get a clean ratio
    let k = gcd(y1, y2);
    y1 /= k;
    y2 /= k;
    if (y1 < 10 && y2 < 10) cpr = "%u:%u".format(y1,y2);
    
    // Nope, let's rough it up a bit.
    else {
      // While >= 10 committers, halven both committers and pmc
      // to get a simpler number to "mathify".
      while (y1 >= 10) {
          y1 = Math.round(y1/2)
          y2 = Math.round(y2/2);
      }
      // round up/down
      y1 = Math.round(y1);
      y2 = Math.round(y2);
      
      // find greatest common divisor and make the final fraction
      let k = gcd(y1, y2);
      y1 /= k;
      y2 /= k;
      cpr = "roughly %u:%u".format(y1,y2);
    }
    
    
    txt += "There are currently %u committers and %u PMC members in this project.\nThe Committer-to-PMC ratio is %s.\n\n".format(no_com, no_pmc, cpr);
    
    
    
    // Last PMC addition
    let changes = pdata.changes[project].pmc;
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
    changes = pdata.changes[project].committer;
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
    let founded = moment((data.pmcdates[project].pmc[2]||data.pmcdates[project].pmc[1]) * 1000.0);
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
          ntxt += cmt + "<br/>";
        }
      }
      txt += "<hr/><h6>Last report comments from the board: </h6>";
      txt += "<b style='color: #369;'>%s:</b><br/><span style='white-space: wrap; font-size: 0.75rem;'>%s</span>".format(date, ntxt);
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
        let pct_change_txt = "%u%".format(Math.abs(pct_change));
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        if (pct_change > 25 && mldata.quarterly[0] > 5) {
            txt += "<li style='color: #080'>%s had a %s increase in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
        else if (pct_change < -25  && mldata.quarterly[1] > 5) {
            txt += "<li style='color: #800'>%s had a %s decrease in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
    }
    
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "<li>%u BugZilla tickets opened and %u closed in the past quarter.</li>".format(bz[0], bz[1]);
    
    // JIRA changes
    let jira = data.jira[project];
    if (jira[0] || jira[1]) txt += "<li>%u JIRA tickets opened and %u closed in the past quarter.</li>".format(jira[0], jira[1]);
    
    // Commits and contributors
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.commits.change.commits
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      }
      txt += "<li style='color: %s;'>%u commits in the past quarter (%s)</li>".format(color, data.kibble.commits.after.commits, ctxt);
    }
    
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.commits.change.authors
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      }
      txt += "<li style='color: %s;'>%u code contributors in the past quarter (%s)</li>".format(color, data.kibble.commits.after.authors, ctxt);
    }
    
    // GitHub: PRs
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.prs.change.opened
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      }
      txt += "<li style='color: %s;'>%u PRs opened on GitHub, past quarter (%s)</li>".format(color, data.kibble.prs.after.opened, ctxt);
    }
    
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.prs.change.closed
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      }
      txt += "<li style='color: %s;'>%u PRs closed on GitHub, past quarter (%s)</li>".format(color, data.kibble.prs.after.closed, ctxt);
    }
    
    // Append header IF there is data, otherwise nah.
    if (txt.length > 0) txt = "<h5>Potentially useful observations on community health:</h5><ul>" + txt + "</ul>";
    return txt;
}

function activity_tips(data) {
    let three_months_ago = moment().subtract(3, 'months');
    let txt = "";
    
    // Releases
    let rtxt = "";
    let new_releases = 0;
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago) {
          new_releases++;
        }
    }
    let releases_shown = 0;
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago || (new_releases < 3 && releases_shown < 3)) {
            rtxt += "<li>%s was released on %s.</li>".format(rel, reldate.format('YYYY-MM-DD'));
            releases_shown++;
        }
    }
    if (rtxt != '') {
        rtxt = "<h6>Recent releases: </h6><ul>" + rtxt + "</ul><hr/>";
    }
    
    
    // Put it all together
    txt += rtxt;
    if (txt) txt = "<h5>Potentially useful data I found:</h5>" + txt
    return txt;
}


// Quick check for reflow needs
function should_reflow(txt, chars) {
  chars = chars || 80;
  let lines = txt.split(/[\r\n]+/g);
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].length > chars && lines[i].match(/\s/)) return true;
  }
  return false;
}

function reflow(txt, chars) {
  chars = chars || 80;
  let words = txt.match(/([\S+?]+\s*)/mg);
  if (!words) return txt;
  let x = 0;
  let output = "";
  for (var i = 0; i < words.length; i++) {
    let word = words[i];
    x += word.length;
    if (x > chars) {
        output += (x == 0 ? "" : "\n") + word;
        x = word.length;
    } else if (word.indexOf('\n') != -1) {
      x = word.length - word.indexOf('\n') - 1;
      output += word;
    } else {
      output += word;
    }
  }
  return output;
}

function get_charter(pdata) {
  let charter = pdata.pdata[project].charter;
  
  let txt = reflow(charter);
  return txt;
}

function compile_check(pdata, editor) {
  return editor.compile();
}

/******************************************
 Fetched from source/init.js
******************************************/

console.log("/******* ASF Board Report Wizard initializing ********/")
// Adjust titles:
let project = location.search.substr(1);
let loaded_from_draft = false;
let PLACEHOLDER = '[Insert your own data here]';

let editor = null;
let stepper = null;

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

// some glopbal vars for now - we'll get them localized soon enough.
let pdata = {};
let cycles = {};
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


function prime_steps(state, json) {
    // Cancel spinner
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    
    // Create editor and stepper class
    let editor = new UnifiedEditor('unified-report', json.steps);
    let stepper = new ReportStepper('unified-steps', editor, json.steps, 'unified-helper');
    editor.stepper = stepper;
    stepper.pdata = pdata;
    stepper.build(0, true);    
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

function getReportDate(json, pmc, dateOnly, agenda) {
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
	if (agenda) return "board_agenda_%s.txt".format(moment(nextdate).format('YYYY_MM_DD'));
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
 Fetched from source/stepper.js
******************************************/


// Left-hand side stepper for reports
function ReportStepper(div, editor, layout, helper) {
    
    // bind to object
    if (typeof div == "string") this.object = document.getElementById(div);
    else this.object = div;
    
    // bind to helper
    if (typeof helper == "string") this.helper = document.getElementById(helper);
    else this.helper = helper;
    
    this.layout = layout;
    this.editor = editor;
    this.timer = null; // highlight timer
    this.step = -1;
    this.changed = false;
    this.pdata = null;
    
    this.build =function (s, start, noclick, e) {
        s = s || 0;
        
        this.changed = (s == this.step) ? false : true;
        this.step = s;
        
        if (start) {
            this.editor.reset();
        }
        
        
        if (this.changed) this.editor.highlight();
        
        // build the step div
        this.object.innerHTML = '';
        for (var i = 0; i < this.layout.length; i++) {
            let element = this.layout[i];
            let wrapper = new HTML('div', {class: 'wizard-step-wrapper'});
            let x = i;
            wrapper.addEventListener('click', () => { this.build(x);});
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
            this.object.inject(wrapper);
            if (i < this.layout.length-1) {
                let line = new HTML('div', {class: 'wizard-line'});
                if (i < s) line.setAttribute('class', 'wizard-line done');
                this.object.inject(line);
            }
        }
            
        let step = this.layout[s];
        // If helper exists, show useful data
        if (this.helper) {
            this.helper.innerHTML = "<h4>%s:</h4>".format(step.description);
            // Add in help
            if (step.helpgenerator) {
                let f = Function('a', 'b', "return %s(a, b);".format(step.helpgenerator));
                data = f(this.pdata, this.editor)
                this.helper.innerHTML += data + "<hr/>";
            } else if (step.help) {
                this.helper.innerHTML += step.help + "<hr/>";
            }
            // If minimum char size is required for a section, note it here
            if (step.minchars)  {
                this.editor.parse(true);
                let chars_remain = step.minchars;
                for (var n = 0; n < this.editor.sections.length; n++ ) {
                    let sct = this.editor.sections[n];
                    if (sct.title == (step.rawname||step.description) && sct.text.indexOf(PLACEHOLDER) == -1) {
                        chars_remain = step.minchars - sct.text.length;
                        break;
                    }
                }
                if (chars_remain > 0) {
                    this.helper.innerHTML += "<p style='color: red;'>This section needs at least %u more characters.</p>".format(chars_remain);
                }
            }
            // Add tips?
            if (step.tipgenerator) {
                let f = Function('a', 'b', "return %s(a,b);".format(step.tipgenerator));
                data = f(this.pdata, this.editor)
                this.helper.innerHTML += data;
            }
            // If clicked to a section, move cursor
            if (!noclick) {
                this.editor.set_position(step.rawname||step.description);
            }
            if (this.changed || !noclick)  this.editor.mark_section(step.rawname||step.description);
            else {
                window.clearTimeout(this.timer);
                if (event && event.keyCode == 13) this.editor.mark_section(step.rawname||step.description);
                else this.timer = window.setTimeout(() => { this.editor.mark_section(step.rawname||step.description)}, 200);
            }
        }
    }
}

/******************************************
 Fetched from source/unified.js
******************************************/


// Function that highlights headers and optional sectin in a unified editor
function UnifiedEditor_highlight_sections(additional_text) {
    // Don't highlight unless we haven't before or new text is noted
    if (this.have_highligted && !additional_text) return;
    if (this.previous_addl == additional_text) return;
    this.previous_addl = additional_text;
    // Set which sections  highlight
    let hilites = [];
      // Headers are blue
    hilites.push({highlight: /^## [^\r\n]+:/mg, className: 'blue' });
      // Placeholders are grey with red border
    hilites.push({highlight: PLACEHOLDER, className: 'none' });
    
    // Capture text cursor position(s) before we continue.
    let x = $('#unified-report').prop('selectionStart');
    let y = $('#unified-report').prop('selectionEnd');
    let sx = this.object.scrollX, sy = this.object.scrollY;
    
    // If additional text is marked for highlighting, we'll have to
    // first destroy any original highlighting, as it's params changed!
    if (additional_text) {
        let color = 'green'
        // Check for overflow, offer reflowing
        let reflower = document.getElementById('unified-reflow');
        if (reflower) {
            if (should_reflow(additional_text)) {
                color = 'red';
                reflower.innerHTML = "SECTION IS OVERFLOWING 80 CHARACTERS!";
                let btn = new HTML('button', {class: 'btn btn-success btn-sm'}, "Reflow section");
                btn.addEventListener('click', () => {
                    this.object.value = this.object.value.replace(additional_text, Flow.text(additional_text));
                    $(this.object).prop( {
                        'selectionStart': x,
                        'selectionEnd': y}
                        );
                    this.find_section();
                    });
                reflower.inject(btn);
            } else {
                reflower.innerHTML = "";
            }
        }
        $('#unified-report').highlightWithinTextarea('destroy');
        
        // Sections are marked light green
        hilites.push({
            highlight: additional_text,
            className: color
            });
    }
    
    // Run the highlighter on ourselves
    $(this.object).highlightWithinTextarea({
            highlight: hilites
        });
    
    // If x == y (cursor is present and not marking characters),
    // We'll force focus on ourselves as highlighting loses it.
    if (x == y || true) {
        $(this.object).prop( {
            'selectionStart': x,
            'selectionEnd': y}
            );
        $(this.object).focus();
    }
}



// Function for figuring out WHERE we are in our report, cursor-wise
function UnifiedEditor_find_section(e) {
    let tmp = this.object.value;
    this.changed = (this.report == tmp) ? false : true;
    this.report = tmp;
    let spos = this.object.selectionStart;
    
    // Hop to next newline, so marking the title will jump to the right section
    while (this.report[spos] != "\n" && spos < this.report.length) spos++;
    
    let tprec = this.report.substr(0, spos);
    let at_step = -1;
    for (var i = 0; i < this.layout.length; i++) {
        let step = this.layout[i];
        let tline = "## %s:".format(step.rawname || step.description);
        if (tprec.indexOf(tline) != -1) {
            at_step = i;
        }
    }
    
    if (at_step != -1 && this.stepper) {
        this.stepper.build(at_step, false, true, e);
    } 
}


// Quick shortcut to focusing somewhere in the report
function UnifiedEditor_set_position(text) {
    let pos = this.object.value.indexOf(text);
    if (pos != -1) {
        this.object.selectionStart = (pos + text.length + 2);
        this.object.selectionEnd = (pos + text.length + 2);
        this.object.focus();
    }
}

// Parses a unified report into sections
function UnifiedEditor_parse_report(quiet) {
    this.sections = []; // Reset sections
    let sX = 0; // sX is our moving cursor in the text as we parse.
    let tmp = this.object.value; // get our textarea data
    while (tmp.length > 0) {
      // Look for the next "## Foo Bar:" line
      let nextheader = tmp.match(/^## ([^\r\n]+)\r?\n/m);
      if (nextheader) {
        if (!quiet) console.log("Found report header: %s".format(nextheader[0]));
        let title = nextheader[1];
        let spos = tmp.indexOf(nextheader[0]);
        if (spos != -1) {
          sX += spos + nextheader[0].length; // move cursor
          sY = sX;
          // ourr buffer past this header, find another one further down
          tmp = tmp.substr(spos + nextheader[0].length);
          let epos = tmp.search(/^## [^\r\n]+/m);
          // if no further headers, use end of buffer as end pos.
          epos = (epos == -1) ? tmp.length : epos;
          let section = tmp.substr(0, epos);
          // We got something(?), push to sections array.
          if (title.length > 2) {
            this.sections.push({
              title: title.replace(/:.*$/, ''), // crop away colon and any spaces following
              text: section,
              start: sX,
              end: sX + epos
            });
          }
          if (!quiet) console.log("Section contains:");
          if (!quiet) console.log(section);
          tmp = tmp.substr(epos);
        } else { break; }
      } else {
        if (!quiet) console.log("No more report headers found.");
        break
      }
      
    }
}


// Mark a section using the highlighter.
function UnifiedEditor_mark_section(title) {
    this.parse(true);
    let foundit = false;
    for (var i = 0; i < this.sections.length; i++) {
        let section = this.sections[i];
        if (section.title == title && section.text.indexOf(PLACEHOLDER) == -1 && section.text.length > 4) {
            //console.log("Marking entire %s section from %u to %u".format(title, sections[i].start, sections[i].end))
            this.highlight(section.text);
            foundit = true;
            break;
        }
    }
    // If we don't know what to highlight, "reset" by highlighting a
    // piece of text that doesn't exist. HACK HACK HACK.
    if (!foundit) {
        this.highlight("<-- EXTERMINATE -->");
    }
}


// Function for resetting a report to follow layout
function UnifiedEditor_reset() {
    this.report = "";
    this.changed = true;
    for (var i = 0; i < this.layout.length; i++) {
        let step = this.layout[i];
        if (!step.noinput || step.rawname) {
            this.report += "## %s:\n".format(step.rawname || step.description);
            if (step.generator) {
                let f = Function('a', "return %s(a);".format(step.generator));
                data = f(this.stepper.pdata)
                if (data && data.length > 0) this.report += data
            } else {
                this.report += PLACEHOLDER;
            }
            this.report += this.report[this.report.length-1] == '\n' ? '\n' : "\n\n";
        }
    }
    this.object.value = this.report;
    this.sections = [];
}

// Function for compiling (validating) a report
function UnifiedEditor_compile() {
    this.compiles = true;
    let text = "";
      let required_sections = [];
      this.parse();
      for (var i = 0; i < this.layout.length; i++) {
        let step = this.layout[i];
        if (!step.noinput) {
          let found = false;
          required_sections.push(step.rawname||step.description);
          for (var n = 0; n < this.sections.length; n++) {
            if (this.sections[n].title == (step.rawname||step.description)) {
              found = true;
              if (this.sections[n].text.indexOf(PLACEHOLDER) != -1) {
                console.log("Found placeholder text: " + PLACEHOLDER)
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> contains placeholder text!</li>".format(this.sections[n].title);
                this.compiles = false;
              } else if (step.minchars && this.sections[n].text.length < step.minchars) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> MUST contain more information!</li>".format(this.sections[n].title);
              }
              else if (this.sections[n].text.length < 20) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> <kbd>%s</kbd> seems a tad short?</li>".format(this.sections[n].title);
              } else {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: green;'>&#x2713;</span> <kbd>%s</kbd> seems alright</li>".format(this.sections[n].title);
                
              }
              break;
            }
          }
          if (!found) {
            this.compiles = false;
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> is missing from the report!</li>".format(step.description);
          }
        }
        
      }
      
      // Remark on additional sections not required
      for (var n = 0; n < this.sections.length; n++) {
          if (!required_sections.has(this.sections[n].title)) {
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> Found unknown section <kbd>%s</kbd></li>".format(this.sections[n].title);
          }
      }
     
    
    if (text.length > 0) {
        text = "<h5>Report review results:</h5>The following remarks were logged by the report compiler:<br/><ul>" + text + "</ul>";
    }
    if (!this.compiles) {
      text += "Your report could possibly use some more work, and that's okay! You can always save your current report as a draft and return later to work more on it. Drafts are saved for up to two months.";
    }
    else {
        text += "That's it, your board report compiled a-okay and is potentially ready for submission! If you'd like more time to work on it, you can save it as a draft, and return later to make some final edits. Or you can publish it to the agenda via Whimsy.";
    }
    text += "<br/><button class='btn btn-warning' onclick='save_draft();'>Save as draft</button>"
    if (this.compiles) text += " &nbsp; &nbsp; <button onclick='publish_report();' class='btn btn-success'>Publish via Whimsy</button>"
    else text += " &nbsp; &nbsp; <button class='btn btn-secondary' disabled title='Please fix the above issues before you can publish'>Publish via Whimsy</button>"
    return text;
}


// This is the Unfied Editor for reports.
function UnifiedEditor(div, layout) {
    // Bind to our textarea, direct or via ID.
    console.log(typeof div)
    if (typeof div == "string") this.object = document.getElementById(div);
    else this.object = div;
    
    this.layout = layout; // our JSON report layout (steps.json)
    this.sections = []; // Sections we have or have found in the editor.
    this.report = ""; // The combined report
    this.stepper = null; // optional stepper class
    
    this.have_highligted = false; // whether we have highlighted before?
    this.changed = false;  // whether report changed since last parse
    this.compiles = false; // Whether compiles are okay
    
    // Function references
    this.highlight = UnifiedEditor_highlight_sections;
    this.mark_section = UnifiedEditor_mark_section;
    this.parse = UnifiedEditor_parse_report;
    this.set_position = UnifiedEditor_set_position;
    this.reset = UnifiedEditor_reset;
    this.find_section = UnifiedEditor_find_section;
    this.compile = UnifiedEditor_compile;
    
    // set div events
    this.object.addEventListener('keyup', () => { this.find_section(true); });
    this.object.addEventListener('mouseup', () => { this.find_section(); });
    
}


/******************************************
 Fetched from source/whimsy-flow.js
******************************************/

// borrowed from https://whimsy.apache.org/board/agenda/app.js

class Flow {
  // reflow comment
  static comment(comment, initials, indent="    ") {
    let lines = comment.split("\n");
    let len = 71 - indent.length;

    for (let i = 0; i < lines.length; i++) {
      lines[i] = ((i == 0 ? initials + ": " : `${indent} `)) + lines[i].replace(
        new RegExp(`(.{1,${len}})( +|$\\n?)|(.{1,${len}})`, "g"),
        `$1$3\n${indent}`
      ).trim()
    };

    return lines.join("\n")
  };

  // reflow text.  Indent is a string containing the amount of spaces that are
  // to be added to each line.  The Incubator has special punctuation rules that
  // prohibit the joining of lines where the first line ends in either a colon
  // or a question mark.
  static text(text, indent="", puncrules=false) {
    // remove trailing spaces on lines
    text = text.replace(/[ \r\t]+\n/g, "\n");

    // split into lines
    let lines = text.split("\n");

    // join consecutive lines, making exception for lines that start with a 
    // hash (#) and <markers> like <private>, ")".
    for (let i = lines.length - 1; i >= 1; i--) {
      if (/^$|^#|\w>$/m.test(lines[i - 1])) continue;
      if (puncrules && /[:?]$/m.test(lines[i - 1])) continue;

      if (/^\s*\w/m.test(lines[i]) && !/^\s*\d+\./m.test(lines[i])) {
        lines.splice(i - 1, 2, lines[i - 1] + lines[i].replace(/^\s*/m, " "))
      }
    };

    // reflow each line
    let len = 78 - indent.length;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.length <= len) continue;
      let prefix = /^\d+\.\s+|^\W*/m.exec(line)[0];

      if (prefix.length == 0) {
        // not indented -> split
        lines[i] = line.replace(
          new RegExp(`(.{1,${len}})( +|$\\n?)`, "g"),
          "$1\n"
        ).replace(/[\n\r]+$/m, "")
      } else {
        // ensure line can be split after column 40
        let lastspace = /^.*\s\S/m.exec(line);

        if (lastspace && lastspace[0].length - 1 > 40) {
          // preserve indentation.
          let n = len - prefix.length;
          indent = prefix.replace(/\S/g, " ");

          lines[i] = prefix + line.slice(prefix.length).replace(
            new RegExp(`(.{1,${n}})( +|$\\n?)`, "g"),
            indent + "$1\n"
          ).replace(indent, "").replace(/[\n\r]+$/m, "")
        }
      }
    };

    return lines.join("\n")
  }
};