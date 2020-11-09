/*
* Copyright 2020 William Siew
* */
function setupGradesServer() {
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=1322
            // this if block only returns the link of the page where you insert grades
            if (message.options.action == "reportGrades"){
                options = message.options.options
                studentTR = $("form[action=\"enterGrades.cgi\"]>table>tbody>tr:has(td:contains('"+options.directoryId+"'))")
                headersTD = $("form[action=\"enterGrades.cgi\"]>table>tbody>tr:first td")
                
                if(studentTR.length != 1){
                    alert("Error: More than one student with that directory ID found")
                    return
                }

                // maps assignment name provided in Extension Options, Eg. Proj 2 -> P2
                assignmentName = options.projName[0] + options.projName[options.projName.length - 1]
                // find index of assignment in headers
                index = 0
                headersTD.each(function(){
                    if($(this).text() === assignmentName){
                        return false
                    }
                    else{
                        index += 1
                    }
                })
                assignmentLink = $(studentTR).find("td").eq(index).find("a").prop("href")
                sendResponse(assignmentLink)
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?subPartOf=166356&courseID=1322&stuID=30000
            // this if block fills in the style points and the comment section
            } 
        }
    );

    
}