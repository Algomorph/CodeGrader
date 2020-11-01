
if(location.href.includes("viewGrades.cgi") && location.href.includes("courseID=")){
   
    if(location.href.includes("stuID=")){
        setupInsertGrades();
    } else{
        setupGradesServer();
    }
} 
