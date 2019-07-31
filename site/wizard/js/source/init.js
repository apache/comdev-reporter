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

console.log("/******* ASF Board Report Wizard initializing ********/")
// Adjust titles:
let project = location.search.substr(1);
let loaded_from_draft = false;

if (project.length < 2) {
    GET("/reportingcycles.json", pre_splash, {});
} else {
    document.title = "ASF Board Report Wizard: %s".format(project);
    let titles = document.getElementsByClassName("title");
    for (var i in titles) {
        titles[i].innerText = document.title;
    }
    
    
    console.log("Initializing escrow checks");
    window.setInterval(escrow_check, 250);
    
    GET("/getjson.py?only=%s&anon=true".format(project), prime_wizard, {});
}