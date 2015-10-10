var Vue = require("vue");
var d3 = require("d3");
var moment = require("moment");
var _ = require("lodash");

function daysToPixels(days, timeScale) {
    var d1 = new Date();
    timeScale || (timeScale = g_timescale);
    return timeScale(d3.time.day.offset(d1, days)) - timeScale(d1);
}
var g_timescale;
var adjustTextLabels = function(selection) {
    selection.selectAll('.tick text')
        .attr('transform', 'translate(' + daysToPixels(1) / 2 + ',0)');
}

Vue.component("gantt", {
    template: "<div class='ganttGraph'>",
    props: ["tasks"],
    ready: function(){
        var self = this;
        var margin = {top: 50, right: 20, bottom: 20, left: 20},
            width = parseInt(d3.select(".ganttGraph").style("width"), 10) - margin.left - margin.right,
            height = document.querySelector(".container-upper").clientHeight - margin.top - margin.bottom;

        var tasksGroup;
        var weekendsGroup;

        //初期表示範囲設定
        var now = new Date();
        var dateStart = new Date(now.getTime());
        dateStart.setDate(dateStart.getDate() - 3);
        var dateEnd = new Date(now.getTime());
        dateEnd.setDate(dateEnd.getDate() + 15);

        var xScale = d3.time.scale()
            .domain([dateStart, dateEnd])
            .range([0, width]);

        g_timescale = xScale;

        //曜日表示を日本語に設定
        var ja_JP = d3.locale({
            "decimal": ".",
            "thousands": ",",
            "grouping": [3],
            "currency": ["", "円"],
            "dateTime": "%a %b %e %X %Y",
            "date": "%Y/%m/%d",
            "time": "%H:%M:%S",
            "periods": ["AM", "PM"],
            "days": ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
            "shortDays": ["日", "月", "火", "水", "木", "金", "土"],
            "months": ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
            "shortMonths": ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
        });

        //X軸表示設定
        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("top")
            .ticks(d3.time.day.utc, 1)
            .tickSize(height)
            .tickFormat(ja_JP.timeFormat("%-d"));

        var monthAxis = d3.svg.axis()
            .scale(xScale)
            .orient("top")
            .ticks(d3.time.month.utc, 1)
            .tickSize(height + 20)
            .tickFormat(ja_JP.timeFormat("%B"));

        var update = function (data) {
            var backgroundFill = function(range, className){
                var sundays = weekendsGroup.selectAll("rect." + className)
                    .data(range(xScale.invert(0), xScale.invert(width)));
                sundays.enter()
                    .append("rect")
                    .attr("class", className);

                sundays.exit().remove();
                sundays.attr("x", function(item){
                    return xScale(item);
                });
                sundays.attr("y", 0);
                sundays.attr("width", daysToPixels(1, xScale));
                sundays.attr("height", height);
            };
            backgroundFill(d3.time.sunday.utc.range, "sundayBackground");
            backgroundFill(d3.time.saturday.utc.range, "saturdayBackground");




            var tasks = tasksGroup.selectAll("rect.taskRange")
                .data(data);

            tasks.enter()
                .append("rect")
                .attr("class", "taskRange");

            tasks.exit().remove();

            var text = tasksGroup.selectAll("text.taskName")
                .data(data);

            text.enter()
                .append("text")
                .attr("class", "taskName");

            text.exit().remove();

            //ズーム
            svg.select(".x.axis").call(xAxis)
                        .call(adjustTextLabels);

            svg.select(".x.monthAxis").call(monthAxis);

            //タスク表示
            tasks.attr("x", function (item) {
                return xScale(item.start);
            }).attr("y", function (item, i) {
                return i * 30 + 20
            }).attr("width", function (item) {
                return Math.abs(xScale(item.end) - xScale(item.start));
            }).attr("height", 10);

            //タスクのラベル表示
            text.text(function (item) {
                return item.name
            })
                .attr("text-anchor", "end")
                .attr("x", function (item) {
                    return xScale(item.start) - 10
                })
                .attr("y", function (item, i) {
                    return i * 30 + 30
                });
        };

        //ズーム範囲設定
        var zoom = d3.behavior.zoom()
            .x(xScale)
            .scale(0.5)
            .scaleExtent([0.3, 10])
            .on("zoom", function () {
                update(self.tasks);
            });

        //SVG生成
        var svg = d3.select(".ganttGraph").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);//zoom関数に引数付きでセレクションを渡す

        //ズーム当たり判定
        svg.append("rect")
            .attr("width", width)
            .attr("height", height);

        //X軸目盛り追加
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .call(adjustTextLabels);

        svg.append("g")
            .attr("class", "x monthAxis")
            .attr("transform", "translate(0," + height + ")")
            .call(monthAxis);

        weekendsGroup = svg.append("g")
            .attr("class", "weekends");

        tasksGroup = svg.append("g")
            .attr("class", "tasks");

        var gradient = svg.append("svg:defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

        // Define the gradient colors
        gradient.append("svg:stop")
            .attr("offset", "0%")
            .attr("stop-color", "#9B93E6")
            .attr("stop-opacity", 1);

        gradient.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", "#1E2563")
            .attr("stop-opacity", 1);

        this.$watch("tasks", function(tasks){
            update(tasks);
        }, false, true);
        
    }
});