function taskCheck(elInfo, dest) {
    let taskMan = $(`#taskList-item-${elInfo}`);
    console.log(taskMan);
    if (dest == true) {
        $("hr", taskMan).removeClass("visually-hidden");
        taskMan.addClass("doneTask");
        taskMan.removeClass("taskList-item");
        taskMan.appendTo("#todone");
    } else {
        $("hr", taskMan).addClass("visually-hidden");
        taskMan.removeClass("doneTask");
        taskMan.addClass("taskList-item");
        taskMan.appendTo("#todolist");
    }
}