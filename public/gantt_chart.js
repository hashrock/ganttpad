var d3 = require("d3");
var moment = require("moment");
var _ = require("lodash");

module.exports = function(){
    var _weekendsGroup;
    var _tasksGroup;
    var _xScale;
    var _width;
    var _height;
    var _svg;
    var _xAxis;
    var _monthAxis;
    var _data;
    
    
    function daysToPixels(days, timeScale) {
        var d1 = new Date();
        timeScale || (timeScale = g_timescale);
        return timeScale(d3.time.day.offset(d1, days)) - timeScale(d1);
    }
    var g_timescale;
    var adjustTextLabels = function (selection) {
        selection.selectAll('.tick text')
            .attr('transform', 'translate(' + daysToPixels(1) / 2 + ',0)');
    }
    
    function addGradient(svg) {
        var start = d3.rgb(155, 147, 230);
        var stop = start.darker(3);
    
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
            .attr("stop-color", start.toString())
            .attr("stop-opacity", 1);
    
        gradient.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", stop.toString())
            .attr("stop-opacity", 1);
    }
    
    this.data = function(data){
        _data = data;
    }
    
    this.update = function () {
        var backgroundFill = function (range, className) {
            var days = _weekendsGroup.selectAll("rect." + className)
                .data(range(_xScale.invert(0), _xScale.invert(_width)));
            days.enter()
                .append("rect")
                .attr("class", className);

            days.exit().remove();
            days.attr("x", function (item) {
                return _xScale(item);
            });
            days.attr("y", 0);
            days.attr("width", daysToPixels(1, _xScale));
            days.attr("height", _height);
        };
        backgroundFill(d3.time.sunday.utc.range, "sundayBackground");
        backgroundFill(d3.time.saturday.utc.range, "saturdayBackground");

        var tasks = _tasksGroup.selectAll("rect.taskRange")
            .data(_data);

        tasks.enter()
            .append("rect")
            .attr("class", "taskRange");

        tasks.exit().remove();

        var text = _tasksGroup.selectAll("text.taskName")
            .data(_data);

        text.enter()
            .append("text")
            .attr("class", "taskName");

        text.exit().remove();

        //ズーム
        _svg.select(".x.axis").call(_xAxis)
            .call(adjustTextLabels);

        _svg.select(".x.monthAxis").call(_monthAxis);

        //タスク表示
        tasks.attr("x", function (item) {
            return _xScale(item.start);
        }).attr("y", function (item, i) {
            return i * 30 + 20
        }).attr("width", function (item) {
            return Math.abs(_xScale(item.end) - _xScale(item.start));
        }).attr("height", 10);

        //タスクのラベル表示
        text.text(function (item) {
            return item.name
        })
            .attr("text-anchor", "end")
            .attr("x", function (item) {
                return _xScale(item.start) - 10
            })
            .attr("y", function (item, i) {
                return i * 30 + 30
            });
    };



    this.initialize = function () {
        //FIXME かなり乱暴だが、initializeが走るたびに削除。リサイズの為の対応
        d3.select(".ganttGraph").select("svg").remove();

        var self = this;
        var margin = { top: 50, right: 20, bottom: 20, left: 20 };
        _width = parseInt(d3.select(".ganttGraph").style("width"), 10) - margin.left - margin.right;
        _height = document.querySelector(".container-upper").clientHeight - margin.top - margin.bottom;
            

        //初期表示範囲設定
        var now = new Date();
        var dateStart = new Date(now.getTime());
        dateStart.setDate(dateStart.getDate() - 3);
        var dateEnd = new Date(now.getTime());
        dateEnd.setDate(dateEnd.getDate() + 15);

        _xScale = d3.time.scale()
            .domain([dateStart, dateEnd])
            .range([0, _width]);

        g_timescale = _xScale;

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
        _xAxis = d3.svg.axis()
            .scale(_xScale)
            .orient("top")
            .ticks(d3.time.day.utc, 1)
            .tickSize(_height)
            .tickFormat(ja_JP.timeFormat("%-d"));

        _monthAxis = d3.svg.axis()
            .scale(_xScale)
            .orient("top")
            .ticks(d3.time.month.utc, 1)
            .tickSize(_height + 20)
            .tickFormat(ja_JP.timeFormat("%B"));

        //ズーム範囲設定
        var zoom = d3.behavior.zoom()
            .x(_xScale)
            .scale(0.5)
            .scaleExtent([0.2, 10])
            .on("zoom", function () {
                self.update();
            });

        //SVG生成
        _svg = d3.select(".ganttGraph").append("svg")
            .attr("width", _width + margin.left + margin.right)
            .attr("height", _height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);//zoom関数に引数付きでセレクションを渡す

        //ズーム当たり判定
        _svg.append("rect")
            .attr("width", _width)
            .attr("height", _height);

        //X軸目盛り追加
        _svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + _height + ")")
            .call(_xAxis)
            .call(adjustTextLabels);

        _svg.append("g")
            .attr("class", "x monthAxis")
            .attr("transform", "translate(0," + _height + ")")
            .call(_monthAxis);

        _weekendsGroup = _svg.append("g")
            .attr("class", "weekends");

        _tasksGroup = _svg.append("g")
            .attr("class", "tasks");

        addGradient(_svg);
    }
}
