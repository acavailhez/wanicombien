$(document).ready(function () {
    var wanikaniApiToken = localStorage.getItem('wanikaniApiToken');
    if (!wanikaniApiToken) {
        $('#apiTokenForm').submit(function () {
            wanikaniApiToken = $('#apiTokenInput').val().trim();
            localStorage.setItem('wanikaniApiToken', wanikaniApiToken);
            start();
            return false;
        });
        $('#apiTokenForm').show();
    } else {
        start();
    }

    function start() {
        $('#apiTokenForm').hide();
        var stages = createGraph();
        getFullList('assignments', {
            burned: false,
            unlocked: true,
            hidden: false,
            in_review: true
        }).then(function (assignements) {
            // Increment number of items in each day of each stage
            _.each(assignements, function (data) {
                if (stage === 0) {
                    // Still a lesson
                    return;
                }
                var assignement = data.data;
                var stage = assignement.srs_stage;
                var availableAt = new Date(assignement.available_at);
                var ms = availableAt.getTime() - Date.now();
                var daysBeforeReview = Math.floor(ms / 1000 / 3600 / 24);
                var daysInStage = stages[stage].info.days - daysBeforeReview;
                // Increment days
                stages[stage].days[daysInStage] = (stages[stage].days[daysInStage] || 0) + 1;
            });

            _.each(stages, function (stage, key) {
                _.each(stage.days, function (numberOfItemForDay, key) {
                    var day = parseInt(key, 10);
                    var $bar = stage.$bars.children().eq(day);
                    $bar.css('height', numberOfItemForDay*3 + 'px');
                    $bar.css('background-color', stage.info.color);
                });
            });
            $('#vizu').css({'display': 'flex'});
        });
    }

    function createGraph() {
        var $graph = $('<div id="graph">');
        var totalDays = 0;
        var stages = {};
        _.each(STAGES, function (stage, key) {
            var $stage = $('<div class="stage">');
            $stage.addClass('stage-' + key);
            var $bars = $(' <div class="bars">');
            for (var i = 0; i < stage.days; i++) {
                var $bar = $('<div class="bar">');
                $bars.append($bar);
            }
            $stage.append($bars);
            var $label = $(' <div class="label">');
            $label.text(stage.name);
            $stage.append($label);
            $graph.append($stage);

            totalDays += stage.days;
            stages[key] = {
                info: stage,
                $stage: $stage,
                $bars: $bars,
                days: {},
            };
        });
        _.each(stages, function (stage, key) {
            var percent = stage.info.days / totalDays * 100;
            var barPercent = 1 / stage.info.days * 100;
            stage.$stage.css({'width': (percent + '%')});
            stage.$bars.children().each(function () {
                var $bar = $(this);
                $bar.css({'width': (barPercent + '%')});
            })
        });
        $('#vizu').html('');
        $('#vizu').append($graph);
        return stages;
    }

    function getFullList(url, params) {
        return new Promise(function (resolve, reject) {
            get(url, params).then(function (data) {
                if (data.pages.next_url) {
                    getFullList(data.pages.next_url)
                        .then(function (list) {
                            var fullList = data.data.concat(list);
                            resolve(fullList);
                        });
                } else {
                    resolve(data.data);
                }
            });
        });
    }

    function get(url, params) {
        if (!url.startsWith('https://')) {
            url = 'https://api.wanikani.com/v2/' + url;
        }
        // Possibly implement setTimeout to stay below 60 calls per minute
        console.log('API call to ' + url);
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: url,
                data: params || {},
                dataType: 'json',
                headers: {
                    "Authorization": "Bearer " + wanikaniApiToken,
                    "Wanikani-Revision": "20170710",
                },
                type: "GET",
                success: function (data) {
                    console.log('API call to ' + url + ' success', data);
                    resolve(data);
                },
                error: function (error) {
                    console.error('API call to ' + url + ' failed', error);
                }
            });
        });
    }

});


// https://knowledge.wanikani.com/wanikani/srs-stages/
var STAGES = {
    1: {
        name: "Apprentice 1",
        days: 1,
        color: '#2ecc71',
    },
    2: {
        name: "Apprentice 2",
        days: 1,
        color: '#2ecc71',
    },
    3: {
        name: "Apprentice 3",
        days: 1,
        color: '#27ae60',
    },
    4: {
        name: "Apprentice 4",
        days: 2,
        color: '#27ae60',
    },
    5: {
        name: "Guru 1",
        days: 7,
        color: '#3498db',
    },
    6: {
        name: "Guru 2",
        days: 14,
        color: '#2980b9',
    },
    7: {
        name: "Master",
        days: 30,
        color: '#9b59b6',
    },
    8: {
        name: "Enlightened",
        days: 4 * 30,
        color: '#e74c3c',
    },
}

// https://github.com/yui/yuicompressor/issues/203#issuecomment-514722485
Promise.prototype.error = Promise.prototype['catch'];