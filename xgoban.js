var Callbacks = function() {
    var callbacks = {};
    var callback = function(name) {
        if(!callbacks[name]) {
            callbacks[name] = [];
        }
        return function(f) {
            callbacks[name].push(f);
        };
    };
    var fire = function(name) {
        if(!callbacks[name]) {
            return;
        }
        var applyArguments = [];
        for(var i=1; i<arguments.length; i++) {
            applyArguments.push(arguments[i]);
        }
        for(var i=0; i<callbacks[name].length; i++) {
            var f = callbacks[name][i];
            if(!f) {
                continue;
            }
            f.apply(f, applyArguments);
        }
    };
    var fireOne = function(f) {
        var applyArguments = [];
        for(var i=2; i<arguments.length; i++) {
            applyArguments.push(arguments[i]);
        }
        f.apply(f, applyArguments);
    };
    var removeCallback = function(name, f) {
        if(!callbacks[name]) {
            return;
        }
        for(var i=0; i<callbacks[name].length; i++) {
            var c = callbacks[name][i];
            if(c == f) {
                delete callbacks[name][i];
            }
        }
    };
    return {
        fire: fire,
        fireOne: fireOne,
        callback: callback,
        removeCallback: removeCallback
    }
};
var XGoban = function(sel, opts) {
    var defaultOpts = {
    };
    $.extend(defaultOpts, opts);
    opts = defaultOpts;

    var drawStars = true;
    var self = {};
    var container = $(sel);
    var element;
    var svg = null;
    var canvas = null;
    var drawingElement;

    var width;
    var height;

    var points = [];
    var turn = 'BLACK';
    var callbacks = Callbacks();
    var enabled = true;
    var stateEditable = false;

    var getPoint = function(x, y) {
        // todo: sort points by x and y coord
        // so we when to stop searching
        for(var i=0; i<points.length; i++) {
            var point = points[i]
            var hitArea = point.hitArea;
            if(x >= hitArea.x && y >= hitArea.y
               && x <= hitArea.x2 && y <= hitArea.y2)
           {
               return point;
           }
        }
        return false;
    };
    var ghostElements = {};
    ghostElements['BLACK'] = opts.stoneElement('BLACK');
    ghostElements['WHITE'] = opts.stoneElement('WHITE');
    for(var k in ghostElements) {
        ghostElements[k].addClass('ghost');
    }
    var ghostElement = function() {
        return ghostElements[turn];
    };

    var lastFocusedElement = null;
    var lastFocusedPoint = null;

    var repositionElement = function(el, point) {
        var diameter = point.sizeRatio * (point.radius * 2) + 1;
        el.remove(); // weird resize fix - only likes to be resized while not on the page
        el.width(diameter);
        el.height(diameter);
        el.css({
            left: point.x - (point.sizeRatio * point.radius) - 1,
            top: point.y - (point.sizeRatio * point.radius) - 1
        });
        element.append(el); // weird resize fix
    };
    // todo: refactor out into a Point object
    var repositionPoint = function(pointIndex, sizeRatio) {
        var point = points[pointIndex];
        point.sizeRatio = sizeRatio;
        if(point.element) {
            repositionElement(point.element, point);
        }
        if(point.overlay) {
            repositionElement(point.overlay.element, point);
        }
        if(point.numberElement) {
            repositionElement(point.numberElement, point);
            var width = height = point.radius * 2 - 1;
            var fontSize = point.radius;
            point.numberElement.css({
                fontSize: fontSize+'px',
                lineHeight: height+'px'
            });
        }
    };
    var defocusAllPoints = function() {
        if(lastFocusedPoint) {
            lastFocusedElement.remove();
            lastFocusedElement = null;
            lastFocusedPoint = null;
        }
        for(var k=0; k<points.length; k++) {
            if(points[k].overlay) {
                points[k].overlay.element.remove();
                delete points[k].overlay;
            }
        }
    };
    var number = 1;
    var place = function(pointIndex, stone, focus, check, placedElement, andNumber, sizeRatio) {
        var point = points[pointIndex];
        sizeRatio = sizeRatio ? sizeRatio : 1;
        if(point.stone) {
            return false;
        }
        placedElement = placedElement ? placedElement : ghostElements[stone].clone(true);
        hideGhostElements();
        placedElement.removeClass('ghost');
        point.stone = stone;
        point.element = placedElement;
        repositionPoint(pointIndex, sizeRatio);
        element.append(point.element);

        if(andNumber) {
            var height;
            var width = height = point.radius * 2;
            var numberElement = $('<div class="number"></div>');
            var numberText = ''+(number++);
            numberElement.text(numberText);
            var fontSizeRatio = Math.abs(0-numberText.length+1)/10;
            var fontSize = point.radius - (point.radius*fontSizeRatio);
            var oppositeColor = stone == 'BLACK' ? 'WHITE' : 'BLACK';
            numberElement.css({
                lineHeight: height+'px',
                zIndex: 100,
                color: oppositeColor.toLowerCase(),
                fontSize: fontSize+'px',
                textAlign: 'center',
                position: 'absolute',
                left: point.x - point.radius,
                top: point.y - point.radius,
                width: width,
                height: height
            });
            if($('.number', element).is(':visible')) {
                numberElement.show();
            }
            element.append(numberElement);
            point.numberElement = numberElement;
        }

        defocusAllPoints();
        if(focus === true) {
            var focusElement = opts.focusElement(stone);
            var diameter = point.radius * 2;
            focusElement.width(diameter);
            focusElement.height(diameter);
            focusElement.css({
                left: point.x - point.radius - 1,
                top: point.y - point.radius - 1
            });
            element.append(focusElement);
            lastFocusedElement = focusElement;
            lastFocusedPoint = point;
            point.overlay = {element: focusElement};
        }
        if(opts.rules && check !== false) {
            return opts.rules.check(self, point.point);
        } else {
            return true;
        }
    };
    var clearPoint = function(index) {
        var point = points[index];
        point.sizeRatio = 1;
        if(point.element) {
            point.element.remove();
            point.element = null;
            point.stone = null;
        }
        if(lastFocusedPoint && index == lastFocusedPoint.point) {
            lastFocusedElement.remove();
            lastFocusedElement = null;
            lastFocusedPoint = null;
        }
        if(point.numberElement) {
            point.numberElement.remove();
            point.numberElement = null;
        }
    };
    var clear = function(index) {
        if(index === undefined) {
            for(var k=0; k<points.length; k++) {
                clearPoint(k);
            }
        } else {
            clearPoint(index);
        }
    };
    
    var valueFun = function(point) {
        // todo: redo
        return function() {
            if(point.stone) {
                if(!point.overlay) {
                    return point.stone;
                } else if(point.stone == 'WHITE') {
                    return 'WHITE_DEAD';
                } else if(point.stone == 'BLACK') {
                    return 'BLACK_DEAD';
                }
            } else if(!point.overlay) {
                return 'EMPTY';
            } else if(point.overlay.color == 'WHITE') {
                return 'BLACK_TERRITORY';
            } else if(point.overlay.color == 'BLACK') {
                return 'WHITE_TERRITORY';
            }
        }
    };
    var connectedFun = function(point) {
        return function() {
            var thisValue = point.value();
            var thisNeighbours = $.extend(true, [], point.neighbours);
            var thisConnected = [point.point]
            var seen = [point.point];
            while(thisNeighbours.length > 0) {
                var neighbourIndex = thisNeighbours.shift();
                if(seen.indexOf(neighbourIndex) != -1) {
                    continue;
                }
                seen.push(neighbourIndex);
                var neighbour = points[neighbourIndex];
                if(neighbour.value() == thisValue) {
                    thisNeighbours = thisNeighbours.concat(neighbour.neighbours);
                    thisConnected.push(neighbourIndex);
                }
            }
            return thisConnected;
        };
    };

    var connectedPoints = function(point, withStone) {
        var seen = [point];
        var connectedPoints = [point];
        var neighbours = points[point].neighbours.slice(0);
        var liberties = 0;
        var pStone = withStone ? withStone : points[point].stone;
        for(var i=0; i<neighbours.length; i++) {
            var neighbour = neighbours[i];
            if(seen.indexOf(neighbour) > -1) {
                continue;
            }
            seen.push(neighbour);// definitely a better way to do this due to prior path
            var nStone = points[neighbour].stone;
            if(!nStone) {
                liberties++; // empty point
                if(!pStone) {
                    connectedPoints.push(neighbour);
                    for(var m=0; m<points[neighbour].neighbours.length; m++) {
                        neighbours.push(points[neighbour].neighbours[m]);
                    }
                }
            } else if(nStone == pStone) {
                connectedPoints.push(neighbour);
                for(var m=0; m<points[neighbour].neighbours.length; m++) {
                    neighbours.push(points[neighbour].neighbours[m]);
                }
            }
        }
        return {
            liberties: liberties,
            connectedPoints: connectedPoints
        };
    };
    var setupPoints = function() {
        for(var i=0; i<opts.geometry.points.length; i++) {
            var optPoint = opts.geometry.points[i];
            var x = optPoint[0];
            var y = optPoint[1];
            var neighbours = optPoint[2];
            point = {
                point: i,
                neighbours: neighbours
            };
            point.value = valueFun(point);
            point.connected = connectedFun(point);
            point.originalX = x;
            point.originalY = y;
            point.x = x;
            point.y = y;
            points[i] = point;
        }
        if(opts.geometry.stars) {
            for(var i=0; i<opts.geometry.stars.length; i++) {
                var star = opts.geometry.stars[i];
                points[star].hasStar = true;
            }
        }
        if(!opts.svg) {
            var ctx = canvas.get(0).getContext("2d");
            //ctx.translate(0.5, 0.5);
            draw = function() {
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.clearRect(0, 0, width, height);
                var lines = {};
                for(var i=0; i<points.length; i++) {
                    var point = points[i];
                    if(point.hasStar && drawStars) {
                        ctx.beginPath();
                        ctx.arc(point.x-0.5, point.y-0.5, point.radius*0.25, 0, 2 * Math.PI, false);
                        ctx.fillStyle = '#222';
                        ctx.fill();
                    }

                    for(var j=0; j<point.neighbours.length; j++) {
                        var neighbour = points[point.neighbours[j]];
                        var key = Math.min(point.point, neighbour.point)
                                + 'x' + Math.max(point.point, neighbour.point);
                        if(!lines[key]) {
                            lines[key] = true
                            ctx.beginPath();
                            ctx.moveTo(point.x-0.5, point.y-0.5);
                            ctx.lineTo(neighbour.x-0.5, neighbour.y-0.5);
                            ctx.closePath();
                            ctx.stroke();
                        }
                    }
                }
            };
        }
    };
    var recalculatePointRadius = function() {
        var minDistance = false;
        for(var i=0; i<points.length; i++) {
            var point = points[i];
            for(var j=0; j<point.neighbours.length; j++) {
                var neighbour = points[point.neighbours[j]];
                var diffx = Math.abs(point.x - neighbour.x);
                var diffy = Math.abs(point.y - neighbour.y);
                var distance = Math.sqrt(diffx*diffx + diffy*diffy);
                minDistance = minDistance===false ? distance : Math.min(minDistance, distance);
            }
        }
        var pointRadius = minDistance / 2;
        for(var i=0; i<points.length; i++) {
            var point = points[i];
            var x = point.x;
            var y = point.y;
            var hitArea = {
                x: x - pointRadius,
                y: y - pointRadius,
                x2: x + pointRadius,
                y2: y + pointRadius
            };
            point.originalHitArea = {
                x: hitArea.x,
                y: hitArea.y,
                x2: hitArea.x2,
                y2: hitArea.y2
            };
            point.hitArea = hitArea;
            point.originalRadius = pointRadius;
            point.radius = pointRadius;
            repositionPoint(i);
        }
    };

    var hideGhostElements = function() {
        for(var k in ghostElements) {
            ghostElements[k].remove();
        }
    };

    var draw = function() {};

    var recalculateSize = function() {
        width = container.width();
        height = container.height();
    };

    var fit = function() {
        recalculateSize();
        hideGhostElements();
        drawingElement.attr('width', width);
        drawingElement.attr('height', height);
        element.css({
            width: width,
            height: height
        });
        var ratioX = width / opts.geometry.width;
        var ratioY = height / opts.geometry.height;
        for(var i=0; i<points.length; i++) {
            var point = points[i];
            point.x = point.originalX * ratioX;
            point.x = Math.round(point.x*2)/2;
            if((point.x/0.5) % 2 == 1) {
                point.x += 0.5;
            }
            point.y = point.originalY * ratioY;
            point.y = Math.round(point.y*2)/2;
            if((point.y/0.5) % 2 == 1) {
                point.y += 0.5;
            }
            /*point.radius = point.originalRadius * ratio;
            point.hitArea.x = point.originalHitArea.x * ratio;
            point.hitArea.y = point.originalHitArea.y * ratio;
            point.hitArea.x2 = point.originalHitArea.x2 * ratio;
            point.hitArea.y2 = point.originalHitArea.y2 * ratio;
            */
            //repositionPoint(i);
        }
        recalculatePointRadius();
        if(lastFocusedPoint) {
            repositionElement(lastFocusedElement, lastFocusedPoint);
        }
        draw();
    };

    (function() {
        element = $('<div class="xgoban"></div>');
        if(opts.svg) {
            svg = $('<img />');
            svg.attr('src', opts.svg);
            drawingElement = svg;
        } else {
            canvas = $('<canvas width="'+opts.width+'" height="'+opts.height+'"></canvas>');
            drawingElement = canvas;
        }
        element.append(drawingElement);

        drawingElement.mousemove(function(e) {
            if(!enabled) {
                return;
            }
            var containerOffset = container.offset();
            var x = e.pageX - containerOffset.left;
            var y = e.pageY - containerOffset.top;
            var point = getPoint(x, y);
            if(point && !point.stone) {
                var diameter = point.radius * 2;
                ghostElement().width(diameter);
                ghostElement().height(diameter);
                ghostElement().css({
                    left: point.x - point.radius - 1,
                    top: point.y - point.radius - 1
                });
                var el = ghostElement();
                element.append(el);

                if(!el.data('stoneHandler')) {
                    el.data('stoneHandler', true);
                    el.click(function(e) {
                        if(!enabled) {
                            return;
                        }
                        var x = e.pageX - containerOffset.left;
                        var y = e.pageY - containerOffset.top;
                        var point = getPoint(x, y);
                        if(!point) {
                            return;
                        }
                        e.stopPropagation();
                        e.preventDefault();
                        var moveOutcome = place(point.point, turn, true);
                        if(moveOutcome) {
                            callbacks.fire('placed', {
                                point: point.point,
                                stone: turn
                            });
                        }
                        // todo: publish error event
                        return false;
                    });
                }
            } else {
                ghostElement().remove();
            }
        });
        $(document.body).mousemove(function(e) {
            var containerOffset = container.offset();
            var pageX = e.pageX;
            var pageY = e.pageY;
            if(pageX < containerOffset.left
               || pageX > containerOffset.left + container.outerWidth()
               || pageY < containerOffset.top
               || pageY > containerOffset.top + container.outerHeight())
            {
                hideGhostElements();
            }
        });
        $(document.body).click(function(e) {
            if(!stateEditable) {
                return;
            }
            var containerOffset = container.offset();
            var x = e.pageX - containerOffset.left;
            var y = e.pageY - containerOffset.top;
            var point = getPoint(x, y);
            if(point) {
                e.stopPropagation();
                e.preventDefault();
                callbacks.fire('stateEdit', e, point);
                return false;
            }
        });
        container.prepend(element);

        setupPoints();
        fit();
    })();

    var pointToCoord = function(point) {
        var numPoints = points.length;
        var root = Math.sqrt(numPoints);
        var letters = ["A","B","C","D","E","F","G","H","J","K","L","M","N","O","P","Q","R","S","T"];
        var x = point % root;
        var number = root - ((point - (point % root)) / root);
        return letters[x] + number;
    };

    var setPointOverlay = function(pointIndex, overlayFun) {
        var point = points[pointIndex];
        if(point.overlay) {
            point.overlay.element.remove();
            point.overlay = null;
        }
        var overlay = overlayFun(point.stone);
        var diameter = point.radius * 2;
        overlay.element.width(diameter);
        overlay.element.height(diameter);
        overlay.element.css({
            left: point.x - point.radius - 1,
            top: point.y - point.radius - 1
        });
        element.append(overlay.element);
        point.overlay = overlay;
    };

    var pointRepr = function(stone) {
        if(stone == 'BLACK') {
            return 1;
        } else if(stone == 'WHITE') {
            return 2;
        } else {
            return 0;
        }
    };
    var repr = function() {
        var repr = "";
        for(var i=0; i<points.length; i++) {
            repr += pointRepr(points[i].stone);
        }
        return repr;
    };

    return $.extend(self, {
        opts: opts,
        svg: opts.svg,
        geometry: opts.geometry,
        points: points,
        nonEmptyPoints: function() {
            var nonEmptyPoints = [];
            for(var i=0; i<points.length; i++) {
                var point = points[i];
                if(point.stone) {
                    nonEmptyPoints.push(point);
                }
            }
            return nonEmptyPoints;
        },
        repr: repr,
        type: 'x',
        size: function() {
            return 19; // todo: not all gobans have size
        },
        stateEditable: function() {
            stateEditable = true;
        },
        stateEdit: callbacks.callback('stateEdit'),
        setTurn: function(nextTurn) {
            turn = nextTurn;
        },
        disable: function() {
            enabled = false;
            stateEditable = false;
        },
        enable: function() {
            enabled = true;
        },
        enabled: function(v) {
            if(v===true || v===false) {
                enabled = v;
            }
            return enabled;
        },
        placed: callbacks.callback('placed'),
        connectedPoints: connectedPoints,
        removeCallback: callbacks.removeCallback,
        clear: clear,
        setValue: function(point, value) {
            points[point].value = value;
        },
        focus: function(point) {
            console.log("todo: implement focus");
        },
        defocusAllPoints: defocusAllPoints,
        defocusPoint: function(pointIndex) {
            if(lastFocusedPoint) {
                lastFocusedElement.remove();
                lastFocusedElement = null;
                lastFocusedPoint = null;
            }
            var point = points[pointIndex];
            if(point.overlay) {
                point.overlay.element.remove();
                delete point.overlay;
            }
        },
        setPointOverlay: setPointOverlay,
        resetToSize: function(toSize) {
            // todo: support other sizes other than 9
        },
        place: place,
        hide: function() {
            element.hide();
            hideGhostElements();
        },
        fit: fit,
        show: function() {
            element.show();
            fit();
        },
        remove: function() {
            element.remove();
            element = null;
        },
        drawStars: function(v) {
            var redraw = false;
            if(v === false) {
                drawStars = v;
                redraw = true;
            } else if(v === true) {
                drawStars = v;
                redraw = true;
            }
            if(redraw) {
                draw();
            }
            return drawStars;
        },
        pointToCoord: pointToCoord
    });
};
XGoban.geometry = {
    square: function(size) {
        var points = [];
        var height = (size*2) + 2;
        var width = (size*2) + 2;
        var neighbours = function(x, y, i) {
            var points = [];
            if(y != 0) {
                points.push(i - size);
            }
            if(x != 0) {
                points.push(i - 1);
            }
            if(x != size - 1) {
                points.push(i + 1);
            }
            if(y != size - 1) {
                points.push(i + size);
            }
            return points;
        };
        //.. ... ..
        for(var y=0, i=0; y<size; y++) {
            for(var x=0; x<size; x++, i++) {
                points.push([2+x*2, 2+y*2, neighbours(x, y, i)]);
            }
        }
        var stars = [];
        if(size==9) {
            stars = [20, 24, 56, 60];
        } else if(size==13) {
            stars = [42,45,48,81,84,87,120,123,126];
        } else if(size==19) {
            stars = [294,300,186,180,174,288,66,72,60];
        }
        return {
            width: width, height: height,
            points: points,
            stars: stars
        };
    }
};
XGoban.rules = {
    norules: function() {
        return {
            check: function(goban, point) {
                var stone = goban.points[point].stone;
                var ownLiberties = goban.connectedPoints(point).liberties;
                return {
                    point: point,
                    stone: stone,
                    liberties: ownLiberties,
                    takenPoints: []
                };
            }
        };
    },
    japanese: function() {
        var reprs = []; // board state per move for ko check

        var checkKO = function(goban) {
            var repr = goban.repr();
            var valid = true;
            if(reprs.length > 2) {
                var checkRepr = reprs[reprs.length-2];
                valid = checkRepr != repr;
                // todo: situational ko
            }
            if(valid) {
                reprs.push(repr);
            }
            return valid;
        };
        var checkSuicide = function(goban, point) {
            var stone = goban.points[point].stone;
            var neighbours = goban.points[point].neighbours;
            var ownLiberties = goban.connectedPoints(point).liberties;
            var takenPoints = [];
            for(var i=0; i<neighbours.length; i++) {
                var neighbour = neighbours[i];
                var nStone = goban.points[neighbour].stone;
                if(!nStone) {
                    continue;
                }
                var connected = goban.connectedPoints(neighbour);
                if(connected.liberties == 0 && nStone != stone) {
                    for(var ci=0; ci<connected.connectedPoints.length; ci++) {
                        var c = connected.connectedPoints[ci];
                        goban.clear(c);
                        takenPoints.push(c);
                    }
                }
            }
            if(ownLiberties == 0 && takenPoints.length == 0) {
                goban.clear(point);
                //todo: replace ghost
                //point.placeGhostStone(stone);
                return false;
            } else {
                return {
                    point: point,
                    stone: stone,
                    liberties: ownLiberties,
                    takenPoints: takenPoints
                };
            }
        };
        var check = function(goban, point) {
            var outcome = checkSuicide(goban, point);
            if(outcome === false) {
                return false; // suicide
            } else {
                if(checkKO(goban)) {
                    return outcome;
                } else {
                    console.log("ko");
                    var color = goban.points[point].stone;
                    var oppositeColor = color == 'BLACK' ? 'WHITE' : 'BLACK';
                    goban.clear(point);
                    // todo: takenPoints needs color for multiple color support
                    for(var i=0; i<outcome.takenPoints.length; i++) {
                        var takenPoint = outcome.takenPoints[i];
                        goban.place(takenPoint, oppositeColor, false, false);
                    }
                    return false;
                }
            }
        };
        return {
            check: check
        };
    }
};
