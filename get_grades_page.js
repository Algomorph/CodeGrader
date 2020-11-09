/*
* Copyright 2020 William Siew
* */
function setupGradesServer() {
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=1322
            // this if block only returns the link of the page where you insert grades
            if (message.options.action == "reportGrades"){
                let options = message.options.options
                let studentTR = $("form[action=\"enterGrades.cgi\"]>table>tbody>tr:has(td:contains('"+options.directoryId+"'))")
                let headersTD = $("form[action=\"enterGrades.cgi\"]>table>tbody>tr:first td")
                
                if(studentTR.length != 1){
                    alert("Error: More than one student with that directory ID found")
                    return
                }

                // gradeServerAssignmentID is of format "P2"
                let assignmentName = options.gradeServerAssignmentID
                // find index of assignment in headers
                let index = 0
                let assignmentIDFound = false
                headersTD.each(function(){
                    if($(this).text() === assignmentName){
                        assignmentIDFound = true
                        return false
                    }
                    else{
                        index += 1
                    }
                })
                if(!assignmentIDFound){
                    alert("Error: Assignment " + assignmentName + " not found")
                    return 
                }
                let assignmentLink = $(studentTR).find("td").eq(index).find("a").prop("href")
                sendResponse(assignmentLink)
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?subPartOf=166356&courseID=1322&stuID=30000
            // this if block fills in the style points and the comment section
            } 
        }
    );

    
}