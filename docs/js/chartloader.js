let mainDataUrls = ['https://f1stats.4lima.de/getData.php', 'https://f1status.000webhostapp.com/getData.php'];
let dataUrl = mainDataUrls[Math.floor(Math.random() * mainDataUrls.length)];
let lineChart = undefined;

//JSON export
let datasets = {};
let exportJsonHandler = undefined;

//Excel export
let xlsData = [];
let thisXlsDataExported = false;
let exportXlsHandler = undefined;

//Image export
let exportImageHandler = undefined;

//save data from last 10 requests to reduce number of requests needed
//if requested data is inside one of the previous loaded data elements
let chartDataHistory = [];

function showTable(from, to) {
    let cachedChartData = inChartDataHistory(from, to);
    if(cachedChartData === undefined) {
        $.get({
            url: dataUrl,
            data: {
                'type': 'data',
                'from': from,
                'to': to
            },
            timeout: 15000,
            success: function (data) {
                let parsedData = JSON.parse(data);
                chartCallback(parsedData);
                //push loaded data to history array to reduce requests
                chartDataHistory.push(new ChartData(parsedData, from, to));
                //Limit length to 10 elements
                chartDataHistory.splice(0, Math.max(chartDataHistory.length - 10, 0));
            },
            error: function () {
                switchUrls(from, to);
            }
        });
    } else {
        to = parseInt(to);
        from = parseInt(from);

        //removed unwanted elements from cached data
        for(let i = cachedChartData.length; i > 0; i--) {
            if(cachedChartData[i] !== undefined) {
                let timestamp = parseInt(cachedChartData[i][0]);
                if (timestamp < from || timestamp > to) {
                    cachedChartData.splice(i, 1);
                }
            }
        }
        chartCallback(cachedChartData);
    }

    function chartCallback(chartData) {
        //first element of data is min and max date for datepicker
        let minmax = chartData.shift();
        //save cachedChartData for export to excel
        xlsData = chartData;
        thisXlsDataExported = false;
        generateFavicon(chartData);

        let dataListF1 = [];
        let dataListF1_5 = [];
        let dataListF1Feeder = [];
        for (let d of chartData) {
            let date = new Date(d[0] * 1000);
            dataListF1.push(
                {
                    x: date,
                    y: parseInt(d[1])
                }
            );
            dataListF1_5.push(
                {
                    x: date,
                    y: parseInt(d[2])
                }
            );
            dataListF1Feeder.push(
                {
                    x: date,
                    y: parseInt(d[3])
                }
            );
        }
        datasets = {'r/formula1': dataListF1, 'r/formula1point5': dataListF1_5, 'r/f1feederseries': dataListF1Feeder};

        let ctx = $('#chart');
        let options = {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: false
                    }
                }],
                xAxes: [{
                    type: 'time',
                    time: {
                        displayFormats: {
                            month: 'DD/MM/YY',
                            day: 'DD/MM/YY HH:mm',
                            hour: 'DD/MM/YY HH:mm',
                            minute: 'DD/MM/YY HH:mm',
                        },
                    },
                    distribution: 'linear'
                }]
            },
            tooltips: {
                callbacks: {
                    title: function(tooltipItem) {
                        return formatDate(moment(tooltipItem[0].label, "MMM DD, YYYY, h:m:s a").toDate());
                    },
                    label: function(tooltipItem, data) {
                        return data.datasets[tooltipItem.datasetIndex].label + ': ' + tooltipItem.yLabel + ' users';
                    },
                }
            },
            maintainAspectRatio: false,
            responsive: true,
        };
        if(lineChart !== undefined) {
            lineChart.data =  {
                datasets: [
                    {
                        label: 'r/formula1',
                        data: dataListF1,
                        borderColor: "rgb(235, 55, 55)",
                        backgroundColor: "rgb(235, 55, 55)",
                        fill: false,
                        hidden: !lineChart.isDatasetVisible(0),
                    },
                    {
                        label: 'r/formula1point5',
                        data: dataListF1_5,
                        borderColor: "rgb(235,63,199)",
                        backgroundColor: "rgb(235,63,199)",
                        fill: false,
                        hidden: !lineChart.isDatasetVisible(1),
                    },
                    {
                        label: 'r/f1feederseries',
                        data: dataListF1Feeder,
                        borderColor: "rgb(235,129,0)",
                        backgroundColor: "rgb(235,129,0)",
                        fill: false,
                        hidden: !lineChart.isDatasetVisible(2),
                    }
                ]
            };
            showPoints($('#togglePoints').prop('checked') || $('#togglePoints-mobile').prop('checked'));
            lineChart.update();
        } else {
            lineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'r/formula1',
                            data: dataListF1,
                            borderColor: "rgb(235, 55, 55)",
                            backgroundColor: "rgb(235, 55, 55)",
                            fill: false,
                            pointRadius: 0
                        },
                        {
                            label: 'r/formula1point5',
                            data: dataListF1_5,
                            borderColor: "rgb(235,63,199)",
                            backgroundColor: "rgb(235,63,199)",
                            fill: false,
                            hidden: true,
                            pointRadius: 0
                        },
                        {
                            label: 'r/f1feederseries',
                            data: dataListF1Feeder,
                            borderColor: "rgb(235,129,0)",
                            backgroundColor: "rgb(235,129,0)",
                            fill: false,
                            hidden: true,
                            pointRadius: 0
                        }
                    ]
                },
                options: options
            });

            $('.datepicker').flatpickr({
                minDate: minmax[0] * 1000,
                maxDate: (parseInt(minmax[1]) + 60) * 1000,
                enableTime: true,
                dateFormat: "d/m/Y H:i",
                altFormat: "m/d/Y H:i",
                time_24hr: true,
                locale: {
                    firstDayOfWeek: 1
                }
            });

            if(exportJsonHandler !== undefined) {
                $('#export-json, #export-json-mobile').off('click', '#export-json', exportJsonHandler);
            }
            exportJsonHandler = $("#export-json, #export-json-mobile").on('click', function () {
                $("<a />", {
                    "download": "formula1.json",
                    "href": "data:application/json," + encodeURIComponent(JSON.stringify(datasets))
                }).appendTo("body").on('click', function () {
                    $(this).remove();
                })[0].click();
            });

            if(exportXlsHandler !== undefined) {
                $('#export-xls, #export-xls-mobile').off('click', '#export-xls', exportXlsHandler);
            }
            exportXlsHandler = $("#export-xls, #export-xls-mobile").on('click', function () {
                let pre = new Date();
                if(!thisXlsDataExported) {
                    for (let i = 0; i < xlsData.length; i++) {
                        xlsData[i][0] = new Date(xlsData[i][0] * 1000);
                        xlsData[i][1] = parseInt(xlsData[i][1]);
                        xlsData[i][2] = parseInt(xlsData[i][2]);
                        xlsData[i][3] = parseInt(xlsData[i][3]);
                    }

                    xlsData.unshift(["date", "formula1", "formula1point5", "f1feederseries"]);
                    thisXlsDataExported = true;
                }

                if(typeof XLSX === 'object') {
                    let workbook = XLSX.utils.book_new();
                    let worksheet = XLSX.utils.aoa_to_sheet(xlsData);
                    XLSX.utils.book_append_sheet(workbook, worksheet, "formula1 Stats");
                    XLSX.writeFile(workbook, "formula1Stats.xlsx", {'cellDates': true});
                    console.log("Excel conversion took " + (new Date().getTime() - pre.getTime()) + "ms");
                    $.toast({
                        title: 'Excel Export Information',
                        subtitle: '',
                        content: 'You may want to reformat the date to also show the time in the column.',
                        type: 'info',
                        autohide: false,
                    });
                } else {
                    alert("Excel library not loaded yet. Please try again in a few seconds.\n\nIf this problem persists please try reloading the page and waiting a bit for all required files to load.");
                }
            });

            let exportImg = $('#export-img, #export-img-mobile');
            if(exportImageHandler !== undefined) {
                exportImg.off('click', '#export-img', exportImageHandler);
            }
            exportImageHandler = exportImg.on('click', function () {
                saveAsImage();
            });
        }

        updateShareUrl(from, to);
        setDarkMode(darkModeEnabled());
        filterButton.prop('disabled', false);
        filterButtonMobile.prop('disabled', false);
        loadingIcon.animateWidth(0, 0);
    }
}

//Remember user selected date range for easier sharing with friends
function handleGetParameters() {
    let url = new URL(window.location);
    let from = url.searchParams.get('from');
    let to = url.searchParams.get('to');
    return {from, to};
}

//Update from and get in the url bar
function updateShareUrl(from, to) {
    let url = new URL(window.location);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    $('#shareUrl').attr('value', url.href);
    $('#sharePopover').popover('hide');
}

//Checks if date range is already cached in chartDataHistory and returns the requested dataset if found
function inChartDataHistory(from, to) {
    from = parseInt(from);
    to = parseInt(to);
    for(let i = 0; i < chartDataHistory.length; i++) {
        if(chartDataHistory[i].toReq >= to && chartDataHistory[i].fromReq <= from) {
            //copy array because we don't want to modify the cached data
            return $.extend(true, [], chartDataHistory[i].data);
        }
    }
    return undefined;
}

//Custom date format for datepicker
function formatDate(d) {
    return formatDigit(d.getDate()) + '/' + formatDigit(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + formatDigit(d.getHours()) + ':' + formatDigit(d.getMinutes());

    function formatDigit(i) {
        if(i < 10) {
            return '0' + i;
        }
        return i;
    }
}

function generateFavicon(data) {
    let canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    let ctx = canvas.getContext('2d');
    let skipAmount = Math.floor(data.length / canvas.width);
    let maximum = findMaximum(data);

    ctx.fillStyle = '#cb0000';
    ctx.strokeStyle = ctx.fillStyle;
    ctx.strokeWidth = 2;
    ctx.lineWidth = 4;

    ctx.beginPath();
    let value = data[0][1];
    ctx.moveTo(0, canvas.height - (value / maximum * canvas.height));
    for(let i = 1; i < data.length; i++) {
        value = value * 0.95 + data[i][1] * 0.05;
        if(i % skipAmount === 0) {
            ctx.lineTo(Math.round(i / skipAmount), canvas.height - (value / maximum * canvas.height));
        }
    }
    ctx.stroke();
    $('link[rel="icon"], link[rel="shortcut icon"]').remove();

    let link = document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.sizes = canvas.width + 'x' + canvas.height;
    link.href = canvas.toDataURL("image/png");
    document.getElementsByTagName('head')[0].appendChild(link);

    function findMaximum(data) {
        let max = -Infinity;
        for(let i = 0; i < data.length; i++) {
            max = Math.max(max, data[i][1]);
        }
        return max;
    }
}

//Extend jQuery with custom function
$.fn.animateWidth = function (width, opacity) {
    this.animate({
        'width': width,
        'opacity': opacity,
    }, 350);
};

let filterButton = $('#apply-filter-button');
let filterButtonMobile = $('#apply-filter-button-mobile');
let loadingIcon = $('.loading');
//Startup function
$(function() {
    let from = new Date(new Date().setDate(new Date().getDate() - 1));
    let to = new Date();

    let getParams = handleGetParameters();
    if(getParams['from'] !== null && getParams['to'] !== null) {
        from = new Date(parseInt(getParams['from']) * 1000);
        to = new Date(parseInt(getParams['to']) * 1000);
    }
    showTable(Math.round(from.getTime() / 1000), Math.round(to.getTime() / 1000));

    $('#datepicker-from').val(formatDate(from));
    $('#datepicker-to').val(formatDate(to));
    $('#datepicker-from-mobile').val(formatDate(from));
    $('#datepicker-to-mobile').val(formatDate(to));

    $('#togglePoints, #togglePoints-mobile').on('click',function () {
        showPoints(this.checked);
    });
    
    $('#darkModeToggle, #darkModeToggle-mobile').on('click', function () {
        let moonIcon = $(this).find('.moon');

        if(moonIcon.hasClass('active')) {
            setDarkMode(true);
        } else {
            setDarkMode(false);
        }
    });

    filterButton.on('click', function() {
        let from = moment($('#datepicker-from').val(), "DD/MM/YYYY HH:mm").toDate().getTime();
        let to = moment($('#datepicker-to').val(), "DD/MM/YYYY HH:mm").toDate().getTime();
        handleDateInput(from, to);
    });

    filterButtonMobile.on('click', function() {
        let from = moment($('#datepicker-from-mobile').val(), "DD/MM/YYYY HH:mm").toDate().getTime();
        let to = moment($('#datepicker-to-mobile').val(), "DD/MM/YYYY HH:mm").toDate().getTime();
        handleDateInput(from, to);
    });

    function handleDateInput(from, to) {
        filterButtonMobile.prop('disabled', true);
        filterButton.prop('disabled', true);
        loadingIcon.animateWidth(38, 1);

        try {
                            //14 days in ms
            if(to - from > (14 * 86400000)) {
                throw new RangeError("Selected date range too big. (Maximum 2 weeks)");
            }

            if(from < to) {
                showTable(from / 1000, to / 1000);
            } else {
                throw new RangeError("FROM date greater or equal to TO date.");
            }
        } catch (e) {
            alert(e.toString());
            filterButtonMobile.prop('disabled', false);
            filterButton.prop('disabled', false);
            loadingIcon.animateWidth(0, 0);
            console.warn(e);
        }
    }

    if(localStorage.getItem('darkMode') !== null) {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode')));
    }

    $('[data-toggle="tooltip"]').tooltip();

    //Custom popover content
    $("[data-toggle=popover]").popover({
        html : true,
        sanitize: false,
        content: function() {
            let content = $(this).attr("data-popover-content");
            return $(content).children(".popover-body").html();
        },
        title: function() {
            let title = $(this).attr("data-popover-content");
            return $(title).children(".popover-heading").html();
        }
    });
    $(document).on('shown.bs.popover', function() {
        $("input.select-focus").on("click", function () {
            $(this).trigger("select");
            document.execCommand('copy');
        });
    });

    //Dynamically bind event to new tooltips in popover
    let body = $('body');
    body.tooltip({
        selector: '[data-toggle=tooltip-click]',
        trigger: 'click',
        delay: {show: 200, hide: 400}
    });
    //Hide popover tooltip after 2s as it does not close automatically
    $(document).on('shown.bs.tooltip', function(e) {
        if($(e.target).hasClass('autohide')) {
            setTimeout(function() {
                $(e.target).tooltip('hide');
            }, 2000);

        }
    });

    //Add custom beforeDraw to chart so the background on exported image is colored
    Chart.plugins.register({
        beforeDraw: function(c) {
            let ctx = c.chart.ctx;
            ctx.fillStyle = $('body').css('background-color');
            ctx.fillRect(0, 0, c.chart.width, c.chart.height);
        }
    });

    //Add smooth transition to color effect after page has loaded to avoid distracting color fade
    body.css('transition', 'background-color .4s');
    $('.datepicker, .input-group-text, .form-control, .custom-control-label, h2').css('transition', 'background-color .4s, border-color .4s');
});


class ChartData {
    constructor(data, fromReq, toReq) {
        this.data = data;
        this.to = this.findMaximum(data);
        this.from = this.findMinimum(data);
        this.fromReq = fromReq;
        this.toReq = toReq;
    }

    findMaximum(data) {
        let max = -1;
        for(let i = 0; i < data.length; i++) {
            if(parseInt(data[i][0]) > max) {
                max = parseInt(data[i][0]);
            }
        }
        return max;
    }

    findMinimum(data) {
        let min = 8640000000000000;
        for(let i = 0; i < data.length; i++) {
            if(parseInt(data[i][0]) < min) {
                min = parseInt(data[i][0]);
            }
        }
        return min;
    }
}