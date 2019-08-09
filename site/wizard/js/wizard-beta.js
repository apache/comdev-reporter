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
                meta.headers['Content-Type'] = 'application/json; charset=UTF-8';
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
let editor_type = 'unified';

function save_draft() {
    js = {
        'project': project,
        'action': 'save',
        'type': 'unified',
        'report': draft_stepper.editor.report
    }
    
    let formdata = JSON.stringify(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Saving draft...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById("pname").style.display = 'none';
    
    POST('/api/drafts/save', draft_saved, {}, formdata);
}

function draft_saved(state, json) {
    // Disengage spinner
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    document.getElementById("pname").style.display = 'block';
    
    if (json.filename) {
        draft_stepper.editor.check_changes(true);
        modal("Draft was saved in the reporter database as <kbd>%s</kbd>. You can revisit this draft at any time by loading it from the base data tab. Drafts are kept for up to two months.".format(json.filename));
        let obj = {
          yours: true,
          filename: json.filename
        };
        let a = json.filename.split('-');
        let ts = a[2];
        saved_drafts[ts] = obj;
    } else {
        modal("Could not save draft: %s".format(json.error || "Unspecified error"));
    }
}


function load_draft(filename) {
    GET('/api/drafts/fetch?%s'.format(filename), read_draft, {});
}

function read_draft(state, json) {
    if (json.report) {
        draft_stepper.editor.object.value = json.report;
        draft_stepper.editor.report = json.report;
        window.setTimeout(() => { draft_stepper.editor.highlight() }, 250);
        draft_stepper.build(0, false, false);
        draft_stepper.editor.check_changes(true);
        modal("Draft was successfully loaded and is ready.");
    } else {
        modal("Could not load report draft :/");
    }
}


function list_drafts(pdata, editor) {
  if (!saved_drafts) {
    GET('/api/drafts/index?%s'.format(project), show_draft_list, {stepper:editor.stepper});
    return "";
  }
  else {
    return show_draft_list({stepper: editor.stepper});
  }
}

function show_draft_list(state, json) {
  if (json && json) { saved_drafts = json.drafts || {}; }
  draft_stepper = state.stepper||draft_stepper; // hackish for now!
  if (!draft_stepper) return;
  let txt = "";
  let filenames = Object.keys(saved_drafts||{});
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
  if (!window.confirm("Are you sure you wish to delete %s?".format(filename))) {
    return;
  }
  GET('/api/drafts/delete?%s'.format(filename), deleted_draft, {filename: filename});
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
    
    if (meta_data && meta_data.filed) {
      if (!window.confirm("The report already exists in %s. Do you wish to force an update?".format(agendafile))) {
        return;
      }
      js.digest = meta_data.report.digest;
      js.attach = meta_data.report.attach;
    }
    
    let formdata = JSON.stringify(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Publishing report, hang on...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById("pname").style.display = 'none';
    
    POST('/api/whimsy/publish', report_published, {}, formdata);
}

function report_published(state, json) {
  // Disengage spinner
  document.getElementById('wizard_spinner').style.display = 'none';
  document.getElementById('wrapper').style.display = 'block';
  document.getElementById("pname").style.display = 'block';
  
  if (json && json.okay) {
    modal("Your report was successfully posted to the board agenda!");
    draft_stepper.editor.check_changes(true);
  } else {
    modal("Something went wrong, and we couldn't publish your report.<br/>Please check with the Whimsy tool to see if there is already a report posted!");
  }
  
  // Force whimsy reload of report meta data
  GET("/api/whimsy/agenda/refresh?%s".format(project), prime_meta, {noreset: true});
    
}

function load_from_agenda() {
  if (meta_data && meta_data.report && meta_data.filed) {
    if (draft_stepper.editor.unsaved && !window.confirm("You have unsaved changes to your current draft. Do you wish to override these with the report in the agenda file??")) return;
    draft_stepper.editor.object.value = meta_data.report.report;
    draft_stepper.editor.report = meta_data.report.report;
    window.setTimeout(() => { draft_stepper.editor.highlight() }, 250);
    draft_stepper.build(0, false, false);
    draft_stepper.editor.check_changes(true);
    let reflower = document.getElementById('unified-reflow');
    if (reflower) {
      reflower.innerHTML = "Notice: Loaded most recent version of report from current agenda into editor.";
      reflower.style.visibility = 'visible';
    }
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
    let changes = pdata.pmcdates[project].roster;
    let now = moment();
    let three_months_ago = now.subtract(3, 'months');
    let no_added = 0;
    let last_added = null;
    txt += "Community changes, past quarter:\n";
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1]*1000.0);
        if (!last_added || last_added[1] < change[1])  {
            last_added = change;
        }
        if (added.isAfter(three_months_ago) && added.format('YYYY-MM-DD') != founded.format('YYYY-MM-DD')) {
            no_added++;
            txt += "- %s was added to the PMC on %s\n".format(name, added.format('YYYY-MM-DD'));
        }
    }
    
    if (!no_added) {
        if (founded.isAfter(three_months_ago)) {
          txt += "- No new PMC members (project graduated recently).\n";
        }
        else if (last_added) {
            txt += "- No new PMC members. Last addition was %s on %s.\n".format(last_added[0], moment(last_added[1]*1000.0).format('YYYY-MM-DD'));
        } else {
          txt += "- No new PMC members were added.\n";
        }
    }
    
    // Last Committer addition
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
        if (last_added) {
            txt += "- No new committers. Last addition was %s on %s.\n".format(last_added[0], moment(last_added[1]*1000.0).format('YYYY-MM-DD'));
        } else {
          txt += "- No new committers were added.\n";
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
    txt += "<br/>"
    if (meta_data.found) {
      txt += "<b>Report expected this month:</b> YES<br/>";
      txt += "<b>Filed to agenda: </b>";
      if (meta_data.filed) {
        txt += "<span style='color: #080;'>Yes</span> <a class='btn btn-primary btn-sm' href='javascript:void(load_from_agenda());'>Load from agenda</a>.";
      } else {
        txt += "<span style='color: #800;'>Not yet</span>";
      }
      txt += "<br/>"
    }
    
    // Previous comments of note?
    let cdates = Object.keys(meta_data.comments||{});
    cdates.sort();
    if (meta_data && cdates.length > 0) {
      let date = cdates[cdates.length-1];
      let comment = meta_data.comments[date];
      
      // split and rejoin comments
      let ntxt = "";
      let a = comment.match(/(?:^|\n)([a-z0-9]+: [\s\S\r\n]+?)(?=(\n[a-z0-9]+:|$))/gi);
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
    GET("/api/overview", splash, {});
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
        new HTML('td', {}, "Editor:"),
        new HTML('td', {}, "Full statistics:"),
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
            let elink = new HTML('td', {}, new HTML('a', {href: '?%s'.format(key)}, "Board report editor"));
            let slink = new HTML('td', {}, new HTML('a', {href: 'statistics?%s'.format(key)}, "Full statistics for %s".format(tlpname)));
            let title = new HTML('td', {}, new HTML('b', {}, tlpname));
            let cname = new HTML('td', {style: {color: ccolor}}, new HTML('b', {}, chair));
            tr.inject([title, cname, rd, elink, slink])
            tbl.inject(tr);
        }
    }
    if (!found) {
        let tr = new HTML('tr', {}, new HTML('td', {colspan: 4}, "It doesn't look like you are on any PMCs"));
        tbl.inject(tr);
    }
    html.inject(tbl);
    
}

let busiest_html = {};

function health_tips(data) {
    let txt = "";    
    // Mailing list changes
    for (var ml in data.delivery[project]) {
        let mldata = data.delivery[project][ml];
        let a = ml.match(/([^-]+)-(.+)/);
        ml = "%s@%s.apache.org".format(a[2], a[1]);
        if (a[2].match(/commits|cvs|announce/)) { // we already count commits, so...
          continue;
        }
        let pct_change =Math.floor( 100 * ( (mldata.quarterly[0] - mldata.quarterly[1]) / (mldata.quarterly[1]*1.0) ));
        let pct_change_txt = "%u%".format(Math.abs(pct_change));
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        if ((pct_change > 25 && mldata.quarterly[0] > 5) || (pct_change > 0 && a[2] == 'dev')) {
            txt += "<li style='color: #080'>%s had a %s increase in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
        if ((pct_change < -25 && mldata.quarterly[1] > 5) || (pct_change <= 0 && a[2] == 'dev')) {
            txt += "<li style='color: #800'>%s had a %s decrease in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
    }
    
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "<li>%u BugZilla tickets opened and %u closed in the past quarter.</li>".format(bz[0], bz[1]);
    
    // JIRA changes
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.jira.change.opened;
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.jira.after.opened == 1 ? '' : 's';
      if (! (ctxt == 'no change' && data.kibble.jira.after.opened == 0)) {
        txt += "<li style='color: %s;'>%u issue%s opened in JIRA, past quarter (%s)</li>".format(color, data.kibble.jira.after.opened, s, ctxt);
      }
    }
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.jira.change.closed;
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.jira.after.closed == 1 ? '' : 's';
      if (! (ctxt == 'no change' && data.kibble.jira.after.closed == 0)) {
        txt += "<li style='color: %s;'>%u issue%s closed in JIRA, past quarter (%s)</li>".format(color, data.kibble.jira.after.closed, s, ctxt);
      }
    }
    
    
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
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.commits.after.commits == 1 ? '' : 's';
      txt += "<li style='color: %s;'>%u commit%s in the past quarter (%s)</li>".format(color, data.kibble.commits.after.commits, s, ctxt);
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
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.commits.after.authors == 1 ? '' : 's';
      txt += "<li style='color: %s;'>%u code contributor%s in the past quarter (%s)</li>".format(color, data.kibble.commits.after.authors, s, ctxt);
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
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.prs.after.opened == 1 ? '' : 's';
      if (! (ctxt == 'no change' && data.kibble.prs.after.opened == 0)) {
        txt += "<li style='color: %s;'>%u PR%s opened on GitHub, past quarter (%s)</li>".format(color, data.kibble.prs.after.opened, s, ctxt);
      }
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
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.prs.after.closed == 1 ? '' : 's';
      if (! (ctxt == 'no change' && data.kibble.prs.after.closed == 0)) {
        txt += "<li style='color: %s;'>%u PR%s closed on GitHub, past quarter (%s)</li>".format(color, data.kibble.prs.after.closed, s, ctxt);
      }
    }
    
    // GitHub: Issues
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.issues.change.opened
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.issues.after.opened == 1 ? '' : 's';
      if (! (ctxt == 'no change' && data.kibble.issues.after.opened == 0)) {
        txt += "<li style='color: %s;'>%u issue%s opened on GitHub, past quarter (%s)</li>".format(color, data.kibble.issues.after.opened, s, ctxt);
      }
    }
    
    if (data.kibble) {
      let color = 'black';
      let ctxt = data.kibble.issues.change.closed
      let pct = parseInt(ctxt);
      if (pct > 0) {
        if (pct > 10) color = 'green';
        ctxt += ' increase';
      } else if (pct < 0) {
        if (pct < -10) color = 'maroon';
        ctxt += ' decrease';
      } else {
        ctxt = 'no change';
      }
      let s = data.kibble.issues.after.closed == 1 ? '' : 's';
      if (! (ctxt == 'no change' && data.kibble.issues.after.closed == 0)) {
        txt += "<li style='color: %s;'>%u issue%s closed on GitHub, past quarter (%s)</li>".format(color, data.kibble.issues.after.closed, s, ctxt);
      }
    }
    
    // Busiest topics
    if (data.kibble) {
      let showit = false;
      let busiest = new HTML('li', {}, "Busiest topics (click to pop up): ");
      if (data.kibble.busiest.email.length > 0) {
        showit = true;
        let ul = new HTML('ul');
        let arr = data.kibble.busiest.email;
        for (var i = 0; i < arr.length; i++) {
          let ml = arr[i].source.split('?')[1];
          let li = new HTML('li', {}, [
                                       new HTML("kbd", {}, ml),
                                       new HTML('i', {style: {display: 'inline-block', textIndent: '10px'}}, arr[i].name),
                                       new HTML('span', { style: {display: 'inline-block', textIndent: '10px'}}, "(%u emails)".format(arr[i].count))
                                      ]);
          ul.inject(li);
        }
        busiest_html['email'] = ul.outerHTML;
        let a = new HTML('a', {href: '#', onclick: 'show_busiest("email");', style: {marginLeft: '10px'}}, 'email');
        busiest.inject(a);
      }
      
      
      if (data.kibble.busiest.github.length > 0) {
        showit = true;
        let ul = new HTML('ul');
        let arr = data.kibble.busiest.github;
        for (var i = 0; i < arr.length; i++) {
          let li = new HTML('li', {}, [
                                       new HTML("a", {href: arr[i].url}, arr[i].url.replace('https://github.com/apache/', '')),
                                       new HTML('i', {style: {display: 'inline-block', textIndent: '10px'}}, arr[i].subject),
                                       new HTML('span', { style: {display: 'inline-block', textIndent: '10px'}}, "(%u comments)".format(arr[i].count))
                                      ]);
          ul.inject(li);
        }
        busiest_html['github'] = ul.outerHTML;
        let a = new HTML('a', {href: '#', onclick: 'show_busiest("github");', style: {marginLeft: '10px'}}, 'GitHub');
        busiest.inject(a);
      }
      
      if (data.kibble.busiest.jira.length > 0) {
        showit = true;
        let ul = new HTML('ul');
        let arr = data.kibble.busiest.jira;
        for (var i = 0; i < arr.length; i++) {
          let li = new HTML('li', {}, [
                                       new HTML("a", {href: arr[i].url}, arr[i].key),
                                       new HTML('i', {style: {display: 'inline-block', textIndent: '10px'}}, arr[i].subject),
                                       new HTML('span', { style: {display: 'inline-block', textIndent: '10px'}}, "(%u comments)".format(arr[i].count))
                                      ]);
          ul.inject(li);
        }
        busiest_html['jira'] = ul.outerHTML;
        let a = new HTML('a', {href: '#', onclick: 'show_busiest("jira");', style: {marginLeft: '10px'}}, 'JIRA');
        busiest.inject(a);
      }
      
      if (showit) {
        txt += busiest.outerHTML;
      }
    }
    
    // Append header IF there is data, otherwise nah.
    if (txt.length > 0) {
      txt = "<a href='statistics?%s' target='_blank' class='btn btn-warning btn-sm'>See full metrics (new tab)</a><br/>".format(project) + txt;
      txt = "<h5>Potentially useful observations on community health:</h5><ul>" + txt + "</ul>";
      txt += "<div class='card' style='padding: 4px;'><b>PLEASE DON'T COPY THESE METRICS INTO THE REPORT ALONE!</b><p>While these metrics might offer insights into the wellbeing of the project, what the board of directors <b<really</b> wants to see is the <b>story</b> behind these metrics.</p><p>Please take some time to explain why these metrics are the way they are, and what this means for the project. If you are unsure how to do this, please take a look at some of the examples provided above  (click the button!).</div>";
    }
    return txt;
}

function show_busiest(t) {
  if (busiest_html[t]) {
    let thtml = "<p>These figures are approximate and automatically generated. We advise that you also do your own research if you intend to use this for reports.</p>";
    thtml += busiest_html[t];
    modal(thtml, "Busiest topics:");
  }
}

function activity_tips(data) {
    let three_months_ago = moment().subtract(3, 'months');
    let txt = "";
    
    // Releases
    let rtxt = "";
    let new_releases = 0;
    let ages = [];
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago) {
          new_releases++;
        }
        ages.push(reldate.unix());
    }
    ages.sort((a,b) => b-a);
    ages = ages.splice(0,new_releases >= 3 ? new_releases : 3);
    let to_show = ages.length;
    let releases_shown = 0;
    while (ages.length) {
      let ts = ages.shift();
      for (var rel in data.releases[project]) {
        if (releases_shown == to_show) break;
          let reldate = moment(data.releases[project][rel] * 1000.0);
          if (ts == reldate.unix()) {
              rtxt += "<li>%s was released on %s.</li>".format(rel, reldate.utc().format('YYYY-MM-DD'));
              releases_shown++;
          }
      }
    }
    if (rtxt != '') {
        rtxt = "<h6>Recent releases: </h6><ul>" + rtxt + "</ul>";
        rtxt += new HTML('a', {target: '_blank', href: 'https://reporter.apache.org/addrelease.html?%s'.format(project)}, 'Manage release data').outerHTML;
        rtxt += "<hr/>";
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

function show_examples(examples, title) {
  let out = "<p>Here are some good examples of what to write in your <kbd>%s</kbd> section:</p>".format(title);
  for (var i = 0; i < examples.length; i++) {
    out += "<pre style='background: #FFE; border: 0.75px solid #3339; padding: 3px; border-radius: 3px;'>" + examples[i] + "</pre><hr/>";
  }
  title = "Examples for %s:".format(title);
  modal(out, title);
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
let statsonly = false;

function init_wizard(so) {
    statsonly = so;
    if (project.length < 2) {
        GET("/reportingcycles.json", pre_splash, {});
    } else {
        document.title = so ? "ASF Project Statistics: %s".format(project) : "ASF Board Report Wizard: %s".format(project);
        let titles = document.getElementsByClassName("title");
        for (var i in titles) {
            titles[i].innerText = document.title;
        }
        if (so) {
            if (editor_type == 'unified') {
                console.log("Using unified editor!");
                document.getElementById('wrapper').setAttribute('class', 'unified');
            }
        }
        console.log("Initializing escrow checks");
        window.setInterval(escrow_check, 250);
        
        GET("/api/overview?%s".format(project), prime_wizard, {});
    }
}
document.body.addEventListener('keydown', () => { if (event.keyCode == 27) $("#alert").modal('hide'); });


/******************************************
 Fetched from source/primer.js
******************************************/

// some glopbal vars for now - we'll get them localized soon enough.
let pdata = {};
let cycles = {};
let meta_data = {};

function modal(txt, title = 'Notification') {
    document.getElementById('alert_text').innerHTML = txt;
    document.getElementById('modal-title').innerText = title;
    $("#alert").modal();
}

function prime_wizard(state, json) {
    // Adjust title(s)
    if (!json.pdata[project]) {
        modal("Could not find project data for %s!".format(project));
        return;
    }
    pdata = json;
    document.title = (statsonly ? "ASF Project Statistics: %s" : "ASF Board Report Wizard: %s").format(json.pdata[project].name);
    let titles = document.getElementsByClassName("title");
    for (var i in titles) {
        titles[i].innerText = document.title;
    }
    
    let xtitle = document.getElementById("pname");
    xtitle.innerText = document.title;
    if (statsonly) {
        GET("/reportingcycles.json", prime_cycles, {});
    } else {
        GET("/api/whimsy/agenda?%s".format(project), prime_meta, {})
    }
}

function prime_meta(state, json) {
    meta_data = json;
    if (state && state.noreset) return;
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
    
    if (!statsonly) {
        // Create editor and stepper class
        let editor = new UnifiedEditor('unified-report', json.steps);
        let stepper = new ReportStepper('unified-steps', editor, json.steps, 'unified-helper');
        editor.stepper = stepper;
        draft_stepper = stepper;
        stepper.pdata = pdata;
        stepper.build(0, true);
    }
    else {
        StatisticsPage(json.steps, pdata);
    }
    document.getElementById("pname").style.display = 'block';
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
 Fetched from source/statistics_generator.js
******************************************/

moment.locale('en');

function statistics_roster(pdata) {
    // PMC age
    let founded = moment((pdata.pmcdates[project].pmc[2] || pdata.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();

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
    if (y1 < 10 && y2 < 10) cpr = "%u:%u".format(y1, y2);

    // Nope, let's rough it up a bit.
    else {
        // While >= 10 committers, halven both committers and pmc
        // to get a simpler number to "mathify".
        while (y1 >= 10) {
            y1 = Math.round(y1 / 2)
            y2 = Math.round(y2 / 2);
        }
        // round up/down
        y1 = Math.round(y1);
        y2 = Math.round(y2);

        // find greatest common divisor and make the final fraction
        let k = gcd(y1, y2);
        y1 /= k;
        y2 /= k;
        cpr = "roughly %u:%u".format(y1, y2);
    }

    let txt = "<h4>Project Composition:</h4>";
    txt += "<ul><li>There are currently %u committers and %u PMC members in this project.</li><li>The Committer-to-PMC ratio is %s.</li></ul>".format(no_com, no_pmc, cpr);



    // Last PMC addition
    let changes = pdata.pmcdates[project].roster;
    let now = moment();
    let three_months_ago = now.subtract(3, 'months');
    let no_added = 0;
    let last_added = null;
    txt += "<h5>Community changes, past quarter:</h5><ul>";
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1] * 1000.0);
        if (!last_added || last_added[1] < change[1]) {
            last_added = change;
        }
        if (added.isAfter(three_months_ago) && added.format('YYYY-MM-DD') != founded.format('YYYY-MM-DD')) {
            no_added++;
            txt += "<li>%s was added to the PMC on %s</li>".format(name, added.format('YYYY-MM-DD'));
        }
    }

    if (!no_added) {
        if (founded.isAfter(three_months_ago)) {
            txt += "<li>-No new PMC members (project graduated recently).</li>";
        } else if (last_added) {
            txt += "<li>No new PMC members. Last addition was %s on %s.</li>".format(last_added[0], moment(last_added[1] * 1000.0).format('YYYY-MM-DD'));
        } else {
            txt += "<li>No new PMC members were added.</li>";
        }
    }


    // Last Committer addition
    changes = pdata.changes[project].committer;
    now = moment();
    three_months_ago = now.subtract(3, 'months');
    no_added = 0;
    last_added = null;
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1] * 1000.0);
        if (!last_added || last_added[1] < change[1]) {
            last_added = change;
        }
        if (added.isAfter(three_months_ago)) {
            no_added++;
            txt += "<li>%s was added as committer on %s</li>".format(name, added.format('YYYY-MM-DD'));
        }
    }

    if (!no_added) {
        if (last_added) {
            txt += "<li>No new committers. Last addition was %s on %s.</li>".format(last_added[0], moment(last_added[1] * 1000.0).format('YYYY-MM-DD'));
        } else {
            txt += "<li>No new committers were added.</li>";
        }
    }
    txt += "</ul>";
    return txt;
}

function statistics_meta(data) {
    let chi = (6.33 + (data.health[project].score * -1.00 * (20 / 12.25))).toFixed(2);
    let cscore = data.health[project].cscore;
    let hcolors = ["#000070", "#007000", "#407000", "#70500", "#700000", "#A00000"]
	let hvalues = ["Super Healthy", "Healthy", "Mostly Okay", "Unhealthy", "Action required!", "URGENT ACTION REQUIRED!"]
    let txt = "<h4>Base Data:</h4>";
    let founded = moment((data.pmcdates[project].pmc[2] || data.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();
    txt += "<b>Founded: </b>%s (%s)<br/>".format(founded.format('YYYY-MM-DD'), age);
    txt += "<b>Chair: </b> %s<br/>".format(data.pdata[project].chair);
    txt += getReportDate(cycles, project) + "<br/>";
    txt += "<b>Community Health Score (Chi): <a href='/chi.py#%s'><span style='color: %s !important;'>%s (%s)</span></a><br/>".format(project, hcolors[cscore], chi, hvalues[cscore]);

    return txt;
}


function kibble_mailstats(xhtml, timeseries, color) {

    let cols = [
        ['x'],
        ['emails'],
        ['threads'],
        ['authors']
    ];
    for (var i = 0; i < 27; i++) {
        let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
        let c = 0;
        let o = 0;
        let a = 0;
        for (var n = 0; n < timeseries.length; n++) {
            let el = timeseries[n];
            if (el.date == date.unix()) {
                c = el['emails'];
                o = el['threads'];
                a = el['authors'];
            }
        }
        cols[0].push(date);
        cols[1].push(c);
        cols[2].push(o);
        cols[3].push(a);
    }
    let cutoff = moment.utc().subtract(13, 'weeks').startOf('week').weekday(1);
    let chartdiv = new HTML('div', {
        style: {
            clear: 'both',
            width: '620px',
            height: '220px',
            position: 'relative',
            background: '#FFF',
            borderRadius: '5px',
            border: '0.75px solid #333'
        }
    });
    xhtml.inject(chartdiv);
    let chart = c3.generate({
        bindto: chartdiv,
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    count: 13,
                    format: (x) => {
                        return moment(x).format('MMM D, YYYY');
                    }
                }
            }
        },
        data: {
            x: 'x',
            types: {
                'emails': 'bar',
                'authors': 'line',
                'threads': 'line'
            },
            columns: cols,
            colors: {
                'emails': color
            },
            color: (color, d) => {
                return d.index < 13 ? '#9639' : color;
            }
        },
        bar: {
            width: {
                ratio: 0.25
            }
        },
        tooltip: {
            format: {
                title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
            }
        }
    });
    xhtml.inject(new HTML('br'));
}

function statistics_health(data) {
    let html = new HTML('div', {
        style: {
            position: 'relative',
            clear: 'both'
        }
    });
    html.inject(new HTML('h4', {}, "Community Health Metrics:"))
    document.body.inject(html);
    html.inject(new HTML('h5', {}, "Notable mailing list trends:"))
    let txt = "";
    // Mailing list changes
    for (var ml in data.delivery[project]) {

        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        let mldata = data.delivery[project][ml];
        let a = ml.match(/([^-]+)-(.+)/);
        ml = "%s@%s.apache.org".format(a[2], a[1]);
        if (a[2].match(/commits|cvs|announce/)) { // we already count commits, so...
            continue;
        }
        txt = "";
        let pct_change = Math.floor(100 * ((mldata.quarterly[0] - mldata.quarterly[1]) / (mldata.quarterly[1] * 1.0)));
        let pct_change_txt = "%u%".format(Math.abs(pct_change));
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        let color = '#369';
        if (pct_change >= 0 && (mldata.quarterly[0] > 10 || a[2] == 'dev')) {
            txt += "<h6 style='color: #080'>%s had a %s increase in traffic in the past quarter (%u emails compared to %u):</h6>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
            color = '#080';
        } else if (pct_change < 0 && (mldata.quarterly[1] > 10 || a[2] == 'dev')) {
            txt += "<h6 style='color: #800'>%s had a %s decrease in traffic in the past quarter (%u emails compared to %u):</h6>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
            color = '#800';
        }

        xhtml.innerHTML = txt;
        html.inject(xhtml);
        
        let hasdevlist = (a[2] == 'dev' && data.kibble.timeseries.devlist && data.kibble.timeseries.devlist.length);
        let hasuserlist = (a[2].match(/^users?$/) && data.kibble.timeseries.devlist && data.kibble.timeseries.devlist.length);

        if (txt.length > 0 && !(hasdevlist||hasuserlist)) {
            let cols = [
                ['x'],
                [ml]
            ];
            for (var i = 0; i < 27; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(4);
                cols[0].push(date);
                cols[1].push(mldata.weekly[date.unix()] || 0);
            }
            let cutoff = moment.utc().subtract(13, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 13,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    color: (color, d) => {
                        return d.index < 13 ? '#9639' : (pct_change < 0 ? '#900' : '#090');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.35
                    }
                },
                tooltip: {
                    format: {
                        value: (x) => '%u emails'.format(x),
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'))
        } else if (hasdevlist) {
            kibble_mailstats(xhtml, data.kibble.timeseries.devlist, color);
        } else if (hasuserlist && txt.length > 0) {
            kibble_mailstats(xhtml, data.kibble.timeseries.userlist, color);
        }

    }

    txt = "";
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "<li>%u BugZilla tickets opened and %u closed in the past quarter.</li>".format(bz[0], bz[1]);

    // JIRA changes
    if (data.kibble.timeseries.jira.length > 0) {
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        let txt = "<h5>JIRA activity:</h5>";
        // Opened tickets
        let color = 'black';
        let ctxt = data.kibble.jira.change.opened;
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.jira.after.opened == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.jira.after.opened == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s opened in JIRA, past quarter (%s)</hi>".format(color, data.kibble.jira.after.opened, s, ctxt);
        }
        
        // Closed tickets
        color = 'black';
        ctxt = data.kibble.jira.change.closed;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.jira.after.closed == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.jira.after.closed == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s closed in JIRA, past quarter (%s)</h6>".format(color, data.kibble.jira.after.closed, s, ctxt);
        }

        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.jira && data.kibble.timeseries.jira.length > 0) {

            let cols = [
                ['x'],
                ['Tickets opened'],
                ['Tickets closed']
            ];
            for (var i = 0; i < 27; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                let o = 0;
                for (var n = 0; n < data.kibble.timeseries.jira.length; n++) {
                    let el = data.kibble.timeseries.jira[n];
                    if (el.date == date.unix()) {
                        c = el['issues closed']
                        o = el['issues opened']
                    }
                }
                cols[0].push(date);
                cols[1].push(o);
                cols[2].push(c);
            }
            let cutoff = moment.utc().subtract(13, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 13,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    color: (color, d) => {
                        return (d.index < 13 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'));
        }
        html.inject(new HTML('hr'));
        
    }

    // Commits and contributors
    if (data.kibble.commits) {
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        html.inject(xhtml);
        let txt = "<h5>Commit activity:</h5>"
        let color = 'black';
        let ctxt = data.kibble.commits.change.commits
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.commits.after.commits == 1 ? '' : 's';
        txt += "<h6 style='color: %s;'>%u commit%s in the past quarter (%s)</h6>".format(color, data.kibble.commits.after.commits, s, ctxt);
        
        // committers
        color = 'black';
        ctxt = data.kibble.commits.change.authors;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.commits.after.authors == 1 ? '' : 's';
        txt += "<h6 style='color: %s;'>%u code contributor%s in the past quarter (%s)</h6>".format(color, data.kibble.commits.after.authors, s, ctxt);
        
        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.commits && data.kibble.timeseries.commits.length > 0) {

            let cols = [
                ['x'],
                ['Commits']
            ];
            for (var i = 0; i < 27; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                for (var n = 0; n < data.kibble.timeseries.commits.length; n++) {
                    let el = data.kibble.timeseries.commits[n];
                    if (el.date == date.unix()) {
                        c = el['commits']
                    }
                }
                cols[0].push(date);
                cols[1].push(c);
            }
            let cutoff = moment.utc().subtract(13, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 13,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    color: (color, d) => {
                        return (d.index < 13 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'))
        }
        html.inject(new HTML('hr'));
        
    }
    

    // GitHub: PRs
    if (data.kibble.timeseries.github.length > 0) {
        
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        html.inject(xhtml);
        let txt = "<h5>GitHub PR activity:</h5>";
        
        let color = 'black';
        let ctxt = data.kibble.prs.change.opened
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.prs.after.opened == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.prs.after.opened == 0)) {
            txt += "<h6 style='color: %s;'>%u PR%s opened on GitHub, past quarter (%s)</h6>".format(color, data.kibble.prs.after.opened, s, ctxt);
        }
        
        
        color = 'black';
        ctxt = data.kibble.prs.change.closed;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.prs.after.closed == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.prs.after.closed == 0)) {
            txt += "<h6 style='color: %s;'>%u PR%s closed on GitHub, past quarter (%s)</h6>".format(color, data.kibble.prs.after.closed, s, ctxt);
        }
        
        
        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.github && data.kibble.timeseries.github.length > 0) {

            let cols = [
                ['x'],
                ['PRs opened'],
                ['PRs closed']
            ];
            for (var i = 0; i < 27; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                let o = 0;
                for (var n = 0; n < data.kibble.timeseries.github.length; n++) {
                    let el = data.kibble.timeseries.github[n];
                    if (el.date == date.unix()) {
                        c = el['pull requests closed']
                        o = el['pull requests opened']
                    }
                }
                cols[0].push(date);
                cols[1].push(o);
                cols[2].push(c);
            }
            let cutoff = moment.utc().subtract(13, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 13,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    colors: {
                        'PRs opened': '#008800',
                        'PRs closed': '#993322'
                    },
                    color: (color, d) => {
                        return (d.index < 13 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'));
        }
        html.inject(new HTML('hr'));
        
    }

    
    // GitHub: issues
    if (data.kibble.timeseries.github.length > 0 && !(data.kibble.issues.after.opened == 0 && data.kibble.issues.before.opened == 0) ) {
        
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        html.inject(xhtml);
        let txt = "<h5>GitHub issues:</h5>";
        
        let color = 'black';
        let ctxt = data.kibble.issues.change.opened;
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.issues.after.opened == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.issues.after.opened == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s opened on GitHub, past quarter (%s)</h6>".format(color, data.kibble.issues.after.opened, s, ctxt);
        }
        
        
        color = 'black';
        ctxt = data.kibble.issues.change.closed;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.issues.after.closed == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.issues.after.closed == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s closed on GitHub, past quarter (%s)</h6>".format(color, data.kibble.issues.after.closed, s, ctxt);
        }
        
        
        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.github && data.kibble.timeseries.github.length > 0) {

            let cols = [
                ['x'],
                ['issues opened'],
                ['issues closed']
            ];
            for (var i = 0; i < 27; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                let o = 0;
                for (var n = 0; n < data.kibble.timeseries.github.length; n++) {
                    let el = data.kibble.timeseries.github[n];
                    if (el.date == date.unix()) {
                        c = el['issues closed']
                        o = el['issues opened']
                    }
                }
                cols[0].push(date);
                cols[1].push(o);
                cols[2].push(c);
            }
            let cutoff = moment.utc().subtract(13, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 13,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    colors: {
                        'issues opened': '#008800',
                        'issues closed': '#993322'
                    },
                    color: (color, d) => {
                        return (d.index < 13 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'));
        }
        html.inject(new HTML('hr'));
    }


    // Busiest topics
    if (data.kibble) {
        let txt = "";
        let showit = false;
        if (data.kibble.busiest.email.length > 0) {
            txt += "<h5>Busiest email threads:</h5>";
            showit = true;
            let ul = new HTML('ul');
            let arr = data.kibble.busiest.email;
            for (var i = 0; i < arr.length; i++) {
                let ml = arr[i].source.split('?')[1];
                let li = new HTML('li', {}, [
                    new HTML("kbd", {}, ml),
                    new HTML('i', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, arr[i].name),
                    new HTML('span', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, "(%u emails)".format(arr[i].count))
                ]);
                ul.inject(li);
            }
            txt += ul.outerHTML;
            
        }


        if (data.kibble.busiest.github.length > 0) {
            showit = true;
            txt += "<h5>Busiest GitHub issues/PRs:</h5>";
            let ul = new HTML('ul');
            let arr = data.kibble.busiest.github;
            for (var i = 0; i < arr.length; i++) {
                let li = new HTML('li', {}, [
                    new HTML("a", {
                        href: arr[i].url
                    }, arr[i].url.replace('https://github.com/apache/', '')),
                    new HTML('i', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, arr[i].subject),
                    new HTML('span', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, "(%u comments)".format(arr[i].count))
                ]);
                ul.inject(li);
            }
            txt += ul.outerHTML;
            
        }

        if (data.kibble.busiest.jira.length > 0) {
            showit = true;
            txt += "<h5>Busiest JIRA tickets:</h5>";
            let ul = new HTML('ul');
            let arr = data.kibble.busiest.jira;
            for (var i = 0; i < arr.length; i++) {
                let li = new HTML('li', {}, [
                    new HTML("a", {
                        href: arr[i].url
                    }, arr[i].key),
                    new HTML('i', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, arr[i].subject),
                    new HTML('span', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, "(%u comments)".format(arr[i].count))
                ]);
                ul.inject(li);
            }
            txt += ul.outerHTML;
            
        }

        if (txt.length > 0) {
            let twrap = new HTML('div');
            twrap.innerHTML = txt;
            html.inject(twrap);
        }
    }
    
    headers = $(html).find("h5");
    let toc = "<ul>";
    for (var i = 0; i < headers.length; i++) {
        let t = headers[i].innerText.replace(/:.*$/, '');
        let id = t.replace(/\s+/g, '').toLowerCase();
        headers[i].setAttribute('id', id);
        toc += "<li><a href='#%s'>%s</a></li>".format(id, t);
    }
    toc += "</ul>";
    let twrap = new HTML('div');
    twrap.innerHTML = toc;
    html.insertBefore(twrap, html.childNodes[1]);
    
    return html;

   
}

function statistics_releases(data) {
    let three_months_ago = moment().subtract(3, 'months');
    let txt = "";

    // Releases
    let rtxt = "";
    let new_releases = 0;
    let ages = [];
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago) {
            new_releases++;
        }
        ages.push(reldate.unix());
    }
    ages.sort((a,b) => b-a);
    ages = ages.splice(0, new_releases >= 3 ? new_releases : 3);
    let to_show = ages.length;
    let releases_shown = 0;
    while (ages.length) {
        let ts = ages.shift();
        for (var rel in data.releases[project]) {
            if (releases_shown == to_show) break;
            let reldate = moment(data.releases[project][rel] * 1000.0);
            if (ts == reldate.unix()) {
                rtxt += "<li>%s was released on %s.</li>".format(rel, reldate.utc().format('YYYY-MM-DD'));
                releases_shown++;
            }
        }
    }
    if (rtxt != '') {
        rtxt = "<h6>Recent releases: </h6><ul>" + rtxt + "</ul>";
        rtxt += new HTML('a', {
            target: '_blank',
            href: 'https://reporter.apache.org/addrelease.html?%s'.format(project)
        }, 'Manage release data').outerHTML;
    }


    // Put it all together
    txt += rtxt;
    if (txt) txt = "<h4>Project Release Activity:</h4>" + txt
    return txt;
}

/******************************************
 Fetched from source/statistics.js
******************************************/


function StatisticsPage(layout, pdata) {
    let wrapper = document.getElementById('wrapper');
    wrapper.style.padding = '8px';
    wrapper.style.height = 'auto';
    wrapper.innerHTML = "";
    for (var i = 0; i < layout.length; i++) {
        let step = layout[i];
        if (step.statsgenerator||step.tipgenerator) {
            let thtml = new HTML('p');
            let f = Function('a', 'b', "return %s(a,b);".format(step.statsgenerator||step.tipgenerator));
            data = f(pdata, {});
            if (typeof data == 'string') thtml.innerHTML += data;
            else if (typeof data == 'object') thtml.inject(data);
            thtml.inject(new HTML('hr'));
            wrapper.inject(thtml);
        }
    }
    
    headers = $(wrapper).find("h4");
    let toc = "<ul style='background: #3333;'>";
    for (var i = 0; i < headers.length; i++) {
        let t = headers[i].innerText.replace(/:.*$/, '');
        let id = t.replace(/\s+/g, '').toLowerCase();
        headers[i].setAttribute('id', id);
        toc += "<li style='display: inline-block; margin-left: 24px;'><a href='#%s'>%s</a></li>".format(id, t);
    }
    toc += "</ul>";
    let twrap = new HTML('div');
    twrap.innerHTML = toc;
    wrapper.insertBefore(twrap, wrapper.childNodes[0]);
    
}


/******************************************
 Fetched from source/stepper.js
******************************************/

let custom_step = {
    'description': 'Custom section',
    'help': "This looks like a custom section. While I don't know how to help you here, it's great that you have additional things to report on :)"
};

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
            this.editor.report_saved = this.editor.report;
        }
        
        
        if (this.changed) this.editor.highlight();
        // skip building if nothing changed
        if (!this.changed && !start && this.editor.report == this.editor.last_cursor_report) return;
        this.editor.last_cursor_report = this.editor.report;
        
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
            
        let step = (s == -1) ? custom_step : this.layout[s];
        // If helper exists, show useful data
        if (this.helper) {
            this.helper.innerHTML = "";
            this.helper.inject(new HTML('h4', {}, step.description + ':'));
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
            
            // Do we have examples?
            if (step.examples && step.examples.length > 0) {
                this.helper.inject(new HTML('hr'));
                this.helper.inject(new HTML('big', {style: {color: '#396'}}, 'Need help with this section?  '));
                let examples = step.examples;
                let mtitle = step.rawname || step.description;
                let btn = new HTML('button', {class: 'btn btn-info'}, "Show examples");
                this.helper.inject(btn);
                btn.addEventListener('click', () => {show_examples(examples, mtitle);}, false);
                this.helper.inject(new HTML('hr'));
            }
            
            // Add tips?
            if (step.tipgenerator) {
                let thtml = new HTML('p');
                let f = Function('a', 'b', "return %s(a,b);".format(step.tipgenerator));
                data = f(this.pdata, this.editor);
                thtml.innerHTML += data;
                this.helper.inject(thtml);
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
                reflower.style.visibility = 'visible';
                reflower.innerHTML = "SECTION IS OVERFLOWING 80 CHARACTERS!";
                let btn = new HTML('button', {style: {marginLeft: '8px'}, class: 'btn btn-success btn-sm'}, "Reflow section");
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
                reflower.style.visibility = 'hidden';
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
    
    let nextheader = tprec.match(/^## ([^\r\n]+)/mg);
    if (nextheader) {
        let title = nextheader[nextheader.length-1].replace(/:[\s\S]*?$/, '').replace(/^##\s+/, '');
        custom_step.description = title;
        for (var i = 0; i < this.layout.length; i++) {
            let step = this.layout[i];
            if (title == (step.rawname || step.description)) {
                at_step = i;
            }
        }
    } else {
        for (var i = 0; i < this.layout.length; i++) {
            let step = this.layout[i];
            let tline = "## %s:".format(step.rawname || step.description);
            if (tprec.indexOf(tline) != -1) {
                at_step = i;
            }
        }
    }
    
    if (this.stepper) {
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
    
    this.check_changes();
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
    // Check whether we have a report in agenda, if so reset to that.
    if (meta_data && meta_data.report && meta_data.filed) {
        load_from_agenda();
        return
    }
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
                this.compiles = false;
              }
              else if (this.sections[n].text.length < 20) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> <kbd>%s</kbd> seems a tad short?</li>".format(this.sections[n].title);
              } else if(should_reflow(this.sections[n].text)) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> Needs to be reflowed, some lines are &gt; 80 chars!</li>".format(this.sections[n].title);
                this.compiles = false;
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
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> Found custom section <kbd>%s</kbd></li>".format(this.sections[n].title);
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
    if (!meta_data.found) {
        text += " &nbsp; &nbsp; <button class='btn btn-secondary' disabled title='Your project is not listed in the current agenda!'>Publish via Whimsy</button>";
        text += "<br/><span style='color: maroon;'>Your project is not expected to report this month. You may save drafts but you cannot publish yet.</span>";
    }
    else if (this.compiles) text += " &nbsp; &nbsp; <button onclick='publish_report();' class='btn btn-success'>Publish via Whimsy</button>"
    else text += " &nbsp; &nbsp; <button class='btn btn-secondary' disabled title='Please fix the above issues before you can publish'>Publish via Whimsy</button>"
    return text;
}

function UnifiedEditor_check_changes(force) {
    if (force) {
        this.report_saved = this.report;
    }
    let saver = document.getElementById('unified-saver');
    if (!saver && this.stepper && this.stepper.helper) {
        saver = new HTML('div', {id: 'unified-saver'});
        this.stepper.helper.inject(saver);
    }
    if (this.report != this.report_saved) {
        this.unsaved = true;
        if (saver) {
            saver.innerText = "Current changes not saved yet - ";
            let btn = new HTML('button', { onclick: 'save_draft();', class: 'btn btn-warning btn-sm'}, 'Save draft');
            saver.inject(btn);
            saver.style.display = 'inline-block';
            window.onbeforeunload = (e) => {
                return "You have unsaved changes to this report. Are you sure you wish to abandon these changes?";
                }
                
        }
    } else if (saver) {
        this.unsaved = false;
        saver.style.display = 'none';
        window.onbeforeunload = null;
    }
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
    this.check_changes = UnifiedEditor_check_changes;
    
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