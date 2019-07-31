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
