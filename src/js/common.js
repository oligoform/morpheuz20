/* 
 * Morpheuz Sleep Monitor
 *
 * Copyright (c) 2013-2016 James Fowler
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/* COMMON ROUTINES DEPLOYED IN PEBBLEKIT.JS and WEBSERVER. WRITE IN PEBBLEKIT.JS. ANT DEPLOYS INTO WEBSERVER. */

/*exported nvl, fixLen, getUserAgent, hrsmin, mThres, mCommonLang, buildRecommendationPhrase, calculateStats, mCommonConst, generateCopyLinkData, sendMailViaServer, buildEmailJsonString */

/*
 * Constants
 */
function mCommonConst() {
  return {
    sampleIntervalMins : 10,
    emailUrl : "http://ui.morpheuz.net/morpheuz/json_email.php",
    emailToken : "morpheuz20",
  };
}

/*
 * Language strings
 */ 
function mCommonLang() {
  return {
    noSleep: "No sleep has been recorded yet. If this is incorrect, select the 'Resend' menu option on your watch and check again in a few minutes.",
    sleepSummary: "Your body and brain requires {0} to {1} hours sleep every night. Last night was {2} as you slept for {3}. Of that sleep: {4} was restless; {5} was light; {6} was deep; {7} was excluded as it either wasn't recorded, or you marked it to be ignored.",
    sleepSummaryNoRecommend: "You slept for {0}. Of that sleep: {1} was restless; {2} was light; {3} was deep; {4} was excluded as it either wasn't recorded, or you marked it to be ignored.",
    minutes: " minutes",
    minute: " minute",
    hour: " hour",
    hours: " hours",
    none: "none",
    tooLittle: "too little",
    tooMuch: "too much",
    ideal: "ideal",
    okResponse : "Sent OK",
    failResponse : "Failed to send with ",
    failGeneral : "Failed to send", 
    emailHeader : "<h2>CSV Sleep data</h2>",
    emailHeader2 : "<h2>Chart Display</h2>",
    emailFooter1 : "<br/>Note: -1 is no data captured, -2 is ignore set, ALARM, START and END nodes represent smart alarm actual, start and end",
    emailFooter2 : "<br/><br/><small>Please don't reply, this is an unmonitored mailbox</small><br/>",
    report : "Report", 
    snoozeText : " You hit snooze {0} times.",
    snoozeTextOnce : " You hit snooze once.",
    snoozeTextTwice : " You hit snooze twice."
  };
}

/*
 * Thresholds
 */
function mThres() {
  return {
    awakeAbove : 1000,
    lightAbove : 120, 
  };
}

/*
 * Some date functions
 */
Date.prototype.format = function(format) // author: meizz
{
  var monName = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
  var dayName = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
  var o = {
    "M+" : this.getMonth() + 1, // month
    "d+" : this.getDate(), // day
    "h+" : this.getHours(), // hour
    "i+" : this.getHours() + 1, // hour + 1
    "m+" : this.getMinutes(), // minute
    "s+" : this.getSeconds(), // second
    "q+" : Math.floor((this.getMonth() + 3) / 3), // quarter
    "S" : this.getMilliseconds()
  // millisecond
  };

  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for ( var k in o) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
    }
  }
  if (/(N+)/.test(format)) {
    format = format.replace(RegExp.$1, monName[this.getMonth()]);
  }
  if (/(W+)/.test(format)) {
    format = format.replace(RegExp.$1, dayName[this.getDay()]);
  }
  return format;
};

/*
 * Add minutes to date
 */
Date.prototype.addMinutes = function(minutes) {
  var copiedDate = new Date(this.getTime());
  return new Date(copiedDate.getTime() + minutes * 60000);
};

/*
 * Provide string format method
 */
String.prototype.format = function()
{
   var content = this;
   for (var i=0; i < arguments.length; i++)
   {
        var replacement = '{' + i + '}';
        content = content.replace(replacement, arguments[i]);  
   }
   return content;
};

/*
 * Protection against nulls
 */
function nvl(field, defval) {
  return field === null || field === "null" || typeof field === "undefined" ? defval : field;
}

/*
 * Fix a string to 2 characters long prefixing a zero
 */
function fixLen(inStr) {
  if (inStr === null || inStr.length > 1)
    return inStr;
  return "0" + inStr;
}



/*
 * Format time as hours and minutes
 * 1 hour
 * 2 hours
 * 1 hour 10
 * 2 hours 20
 * 20 minutes
 * none
 */
function hrsmin(value) {
  if (value === 0) {
    return mCommonLang().none;
  }
  var result = "";
  var hours = Math.floor(value / 60);
  if (hours == 1) {
    result += hours + mCommonLang().hour;
  } else if (hours > 1) {
    result += hours + mCommonLang().hours;
  }
  var minutes = value % 60;
  if (minutes !== 0) {
    if (hours === 0) {
      if (minutes === 1) {
        result += fixLen(String(minutes)) + mCommonLang().minute;
      } else {
        result += fixLen(String(minutes)) + mCommonLang().minutes;
      }
    } else {
      result += " " + fixLen(String(minutes));
    }
  }
  return result;
}

/*
 * Calculate stats
 */
function calculateStats(base, goneoff, splitup) {

  // Get the full set of data up to the wake up point.
  // Ignore nulls
  var timeStartPoint = new Date(base);
  var firstSleep = true;
  var tbegin = null;
  var tends = null;
  var tendsStop = null;
  var ibegin = null;
  var iends = null;
  var iendsStop = null;
  for (var i = 0; i < splitup.length; i++) {
    if (splitup[i] === "") {
      continue;
    }
    var data = parseInt(splitup[i], 10);
    var teststr1 = timeStartPoint.format("hhmm");
    var timeStartPoint1 = timeStartPoint;
    timeStartPoint = timeStartPoint.addMinutes(mCommonConst().sampleIntervalMins);
    var teststr2 = timeStartPoint.format("hhmm");
    if (goneoff != "N" && goneoff >= teststr1 && goneoff <= teststr2) {
      tends = returnAbsoluteMatch(timeStartPoint1, timeStartPoint, goneoff);
      iends = i;
      break;
    } else if (data != -1 && data != -2 && data <= mThres().awakeAbove) {
      if (firstSleep) {
        tbegin = timeStartPoint1;
        ibegin = i;
        firstSleep = false;
      }
      tendsStop = timeStartPoint;
      iendsStop = i;
    }
  }

  // If we haven't got a regular end because of an alarm, then find
  // the last time they were below waking levels of movement
  if (tends === null && tendsStop !== null) {
    tends = tendsStop;
    iends = iendsStop;
  }
  
    // Compute the stats within the bounds of the start and stop times
  var awake = 0;
  var deep = 0;
  var light = 0;
  var ignore = 0;
  if (ibegin !== null && iends !== null) {
    for (var j = ibegin; j <= iends; j++) {
      if (splitup[j] === "") {
        continue;
      }
      var data2 = parseInt(splitup[j], 10);
      if (data2 == -1 || data2 == -2) {
        ignore++;
      } else if (data2 > mThres().awakeAbove) {
        awake++;
      } else if (data2 > mThres().lightAbove) {
        light++;
      } else {
        deep++;
      }
    }
  }

  // Note - the total should really be deep + light + awake + ignore. However begin and end times are calculated to an exact number of minutes
  // (the smart alarm is accurate to the minute), whilst all other times are accurate to a 10 minute period. I'd prefer the time in the summary
  // to match the time recorded in Healthkit.
  var diff = tends - tbegin;
  var total = Math.round((diff/1000)/60);

  return {
    "tbegin" : tbegin,
    "tends" : tends, 
    "deep" : deep * mCommonConst().sampleIntervalMins,
    "light" : light * mCommonConst().sampleIntervalMins,
    "awake" : awake * mCommonConst().sampleIntervalMins,
    "ignore" : ignore * mCommonConst().sampleIntervalMins,
    "total" : total
  };
}

/*
 * Locate match one minute at a time
 */
function returnAbsoluteMatch(early, late, actualstr) {
  var point = early;
  while (point.getTime() < late.getTime()) {
    var teststr = point.format("hhmm");
    if (actualstr === teststr) {
      return point;
    }
    point = point.addMinutes(1);
  }
  return early;
}

/*
 * Generate a recommendation
 */
function generateRecommendation(age, total) {
  if (isNaN(age)) {
    return null;
  }
  
  var nage = parseInt(age, 10);
  
  if (isNaN(nage)) {
    return null;
  }
  
  var min = 0;
  var max = 0;
  if (nage < 1) {
    return "-";
  } else if (nage < 3) {
    min = 11;
    max = 14;
  } else if (nage < 6) {
    min = 10;
    max = 13;
  } else if (nage < 14) {
    min = 9;
    max = 11;
  } else if (nage < 18) {
    min = 8;
    max = 10;
  } else if (nage < 64) {
    min = 7;
    max = 9;
  } else {
    min = 7;
    max = 8;
  }
  
  var actual =  Math.floor(total / 60);
  
  var view = "";
  var diff = 0;
  if (actual < min) {
    view = mCommonLang().tooLittle;
    diff = total - min * 60;
  } else if (actual > max) {
    view = mCommonLang().tooMuch;
    diff = total - max * 60;
  } else {
    view = mCommonLang().ideal;
  }
  
  
  return { "min": min, "max": max, "view": view, "diff": diff };
}

/*
 * Determine a sleep star rating
 */
function determineStars(trex, snoozes) {
  if (trex === null) {
    return 0;
  }
  
  var stars = 5;
  
  if (snoozes > 0) {
    stars--;
  }
  
  if (trex.diff <= -90) {
    stars--;
  } 
  if (trex.diff <= -60) {
    stars--;
  }
  if (trex.diff <= -30) {
    stars--;
  }
  if (trex.diff >= 60) {
    stars--;
  }

  // Return 1 to 5 stars
  return stars;
  
}

/*
 * Build the recommendation phrase
 */
function buildRecommendationPhrase(age, stats, snoozes) {
  
  if (stats.total === 0) {
    return { "summary" : mCommonLang().noSleep, "total": "-", "awake": "-", "light": "-", "deep": "-", "ignore": "-", "stars": 0, 
            "totalStr" : "-", "deepStr" : "-"};
  }
  
  var trex = generateRecommendation(age, stats.total);
  
  var totalStr = hrsmin(stats.total);
  var awakeStr = hrsmin(stats.awake);
  var lightStr = hrsmin(stats.light);
  var deepStr = hrsmin(stats.deep);
  var ignoreStr = hrsmin(stats.ignore);
  
  var stars = determineStars(trex, snoozes);
  
  var summaryTxt;
  if (trex !== null) {
    summaryTxt = mCommonLang().sleepSummary.format(trex.min, trex.max, trex.view, totalStr, awakeStr, lightStr, deepStr, ignoreStr);
  } else {
    summaryTxt = mCommonLang().sleepSummaryNoRecommend.format(totalStr, awakeStr, lightStr, deepStr, ignoreStr);
  } 
  if (snoozes > 2) {
    summaryTxt += mCommonLang().snoozeText.format(snoozes);
  } else if (snoozes == 1) {
    summaryTxt += mCommonLang().snoozeTextOnce;
  } else if (snoozes == 2) {
    summaryTxt += mCommonLang().snoozeTextTwice;
  }
  
  return { "summary" : summaryTxt, "total": totalStr, "awake": awakeStr, "light": lightStr, "deep": deepStr, "ignore": ignoreStr, "stars":  stars,
           "totalStr" : totalStr, "deepStr" : deepStr};
}

/*
 * Prepare the data for the mail links
 */
function generateCopyLinkData(base, splitup, smartOn, fromhr, frommin, tohr, tomin, goneoff, snoozes) {

  var timePoint = new Date(base);
  var body = "<pre>";

  for (var i = 0; i < splitup.length; i++) {
    if (splitup[i] === "") {
      continue;
    }
    body = body + timePoint.format("hh:mm") + "," + splitup[i] + "<br/>";
    timePoint = timePoint.addMinutes(mCommonConst().sampleIntervalMins);
  }

  // Add smart alarm info into CSV data
  if (smartOn) {
    body = body + fromhr + ":" + frommin + ",START<br/>" + tohr + ":" + tomin + ",END<br/>";
    if (goneoff != "N") {
      var goneoffstr = goneoff.substr(0, 2) + ":" + goneoff.substr(2, 2);
      body = body + goneoffstr + ",ALARM<br/>";
    }
    body = body + snoozes + ",SNOOZES<br/>";
  }
  return {
    "body" : body + "</pre>",
  };
}

/*
 * Send an email via the server php
 */
function sendMailViaServer(email, resp) {
  try {
    var msg = "email=" + encodeURIComponent(JSON.stringify(email));

    var req = new XMLHttpRequest();
    req.open("POST", mCommonConst().emailUrl, true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("X-Client-token", mCommonConst().emailToken);
    req.onreadystatechange = function(e) {
      if (req.readyState == 4) {
        if (req.status == 200) {
          resp(1, mCommonLang().okResponse);
        } else {
          resp(0, mCommonLang().failResponse + req.status);
        }
      }
    };
    req.onerror = function(ex) {
      resp(0, mCommonLang().failGeneral);
    };
    req.send(msg);
  } catch (err) {
    resp(0, mCommonLang().failResponse + err.message);
  }
}

/*
 * Build the email json string
 */
function buildEmailJsonString(emailto, base, url, cpy) {
  var reportHtml = "<a href='" + url + "'>" + mCommonLang().report + "</a><br/>";
  // Build email json
  var email = {
    "from" : "Morpheuz <noreply@morpheuz.co.uk>",
    "to" : emailto,
    "subject" : "Morpheuz-" + new Date(base).format("yyyy-MM-dd"),
    "message" : mCommonLang().emailHeader2 + reportHtml + mCommonLang().emailHeader + cpy.body + mCommonLang().emailFooter1 + mCommonLang().emailFooter2
  };
  return email;
}
