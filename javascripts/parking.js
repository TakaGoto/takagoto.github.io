window.onload = function() {
	$.ajax({
		url: "https://fathomless-earth-54980.herokuapp.com/house"
	}).done(function(response) {
		var house = JSON.parse(response)
    var today = new Date()
    var tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    var tomorrowInString = (tomorrow.getMonth() + 1) + "/" + tomorrow.getDate() + "/" + tomorrow.getFullYear()
    var todayInString = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear()

    display(house, tomorrowInString, todayInString)

    $("[data-id=submit]").click(function() {
      var name = $("[data-id=name] option:selected").text()
      var leaving = $("[data-id=leaving]").val()
      var back = $("[data-id=back]").val()

      $.ajax({
		    url: "https://fathomless-earth-54980.herokuapp.com/house",
        data: JSON.stringify({name: name, date: tomorrowInString, leaving: leaving, back: back}),
        method: "POST"
      }).done(function(response) {
        display(JSON.parse(response), tomorrowInString, todayInString)
      })
    })
	})
}

function display(house, tomorrowInString, todayInString) {
  $("[data-id=tomorrow-schedule]").empty()
  $("[data-id=today-schedule]").empty()

  house.forEach((person) => {

    displayTodaySchedule(todayInString, person)
    displayTomorrowSchedule(tomorrowInString, person)

    $("[data-id=tomorrow]").text(tomorrowInString)
    $("[data-id=name]").append("<option value=" + person.name + ">" + person.name + "</option>")
  })
}

function displayTodaySchedule(todayInString, person) {
  var todaySchedule = person.schedules.find((s) => {
    return s.date == todayInString
  })
  if (todaySchedule) {
    $("[data-id=today-schedule]")
      .append("<div> " + person.name + " is leaving " + todaySchedule.leaving + " and coming back " + todaySchedule.back + " </div>")
  }
}

function displayTomorrowSchedule(tomorrowInString, person) {
  var tomorrowSchedule = person.schedules.find((s) => {
    return s.date == tomorrowInString
  })
  if (tomorrowSchedule) {
    $("[data-id=tomorrow-schedule]")
      .append("<div> " + person.name + " is leaving " + tomorrowSchedule.leaving + " and coming back " + tomorrowSchedule.back + " </div>")
  }
}
