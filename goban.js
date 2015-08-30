var Goban = function(opts) {
    this.opts = $.extend(Goban.defaultOpts, opts ? opts : {});
    if(!this.opts.drawer) {
        this.opts.drawer = new Goban.drawer();
    }
    this.element = $('<div class="goban"></div>');
    this.canvas = $('<canvas width="'+opts.width+'" height="'+opts.height+'"></canvas>');
    this.element.append(this.canvas);
    this.ctx = this.canvas.get(0).getContext('2d');
    this.points = [];
    this.callbacks = {
        pointOver: $.Callbacks(),
        pointOut: $.Callbacks()
    };

    if(opts.geometry) {
        var points = this.points;
        var size = this.size();
        (function() {
            for(var i=0; i<opts.geometry.points.length; i++) {
                var optPoint = opts.geometry.points[i];
                var neighbours;
                var hasXY = optPoint.length == 3 && typeof(optPoint[2]) == 'object';
                if(hasXY) {
                    var x = optPoint[0];
                    var y = optPoint[1];
                    neighbours = optPoint[2];
                } else {
                    neighbours = optPoint;
                }
                point = {
                    id: i,
                    neighbours: neighbours,
                    elements: {}
                };
                if(hasXY) {
                    //point.value = valueFun(point);
                    //point.connected = connectedFun(point);
                    point.originalX = x;
                    point.originalY = y;
                    point.x = x;
                    point.y = y;
                }
                points[i] = point;
            }
            if(opts.geometry.stars) {
                for(var i=0; i<opts.geometry.stars.length; i++) {
                    var star = opts.geometry.stars[i];
                    points[star].hasStar = true;
                }
            }
        })();
    }
    var mousemove = $.proxy(function(e) {
        var container = this.element.parent();
        var containerOffset = container.offset();
        var x = e.pageX - containerOffset.left;
        var y = e.pageY - containerOffset.top;
        var point = this.getPoint(x, y);
        if(point && !point.stone) {
            var diameter = point.radius * 2;
            this.callbacks.pointOver.fire(point.id);
        } else {
            this.callbacks.pointOut.fire(point.id);
        }
    }, this);
    $(document.body).mousemove($.proxy(function(e) {
        var container = this.element.parent();
        if(!container[0]) return;

        var containerOffset = container.offset();
        var pageX = e.pageX;
        var pageY = e.pageY;
        if(pageX < containerOffset.left
           || pageX > containerOffset.left + container.outerWidth()
       || pageY < containerOffset.top
       || pageY > containerOffset.top + container.outerHeight())
       {
           this.callbacks.pointOut.fire();
       } else {
           mousemove(e);
       }
    }, this));
};
Goban.prototype.getNeighbours = function(id) {
    return this.points[id].neighbours.slice();
};
Goban.prototype.getStone = function(id) {
    return this.points[id].stoneValue;
};
Goban.prototype.isSameStone = function(a, b) {
    return Goban.utils.deepEquals(this.getStone(a), this.getStone(b));
};

Goban.prototype.getConnectedPoints = function(point, withStoneValue) {
    var seen = [point];
    var connectedPoints = [point];
    var neighbours = this.points[point].neighbours.slice(0);
    var liberties = 0;
    var pStone = withStoneValue !== undefined ? withStoneValue : this.points[point].stoneValue;
    for(var i=0; i<neighbours.length; i++) {
        var neighbour = neighbours[i];
        if(seen.indexOf(neighbour) > -1) {
            continue;
        }
        seen.push(neighbour);// definitely a better way to do this due to prior path
        var nStone = this.points[neighbour].stoneValue;
        if(nStone === undefined) {
            liberties++; // empty point
            if(pStone === undefined) {
                connectedPoints.push(neighbour);
                for(var m=0; m<this.points[neighbour].neighbours.length; m++) {
                    neighbours.push(this.points[neighbour].neighbours[m]);
                }
            }
        } else if(Goban.utils.deepEquals(nStone, pStone)) {
            connectedPoints.push(neighbour);
            for(var m=0; m<this.points[neighbour].neighbours.length; m++) {
                neighbours.push(this.points[neighbour].neighbours[m]);
            }
        }
    }
    return {
        liberties: liberties,
        points: connectedPoints
    };
};
Goban.prototype.redraw = function() {
    this.opts.drawer.redraw(this);
}

Goban.letters = ["A","B","C","D","E","F","G","H","J","K","L","M","N","O","P","Q","R","S","T"];
Goban.xToCoordLetter = function(x) {
    return Goban.letters[x];
};
Goban.xyToCoord = function(xy) {
    var number = xy.y + 1;
    return Goban.xToCoordLetter(xy.x) + number;
};
Goban.pointToCoord = function(point) {
    return Goban.xyToCoord(pointToXY(point));
};

Goban.prototype.pointOver = function(f) {
    this.callbacks.pointOver.add(f);
    return this;
};
Goban.prototype.pointOut = function(f) {
    this.callbacks.pointOut.add(f);
    return this;
};

Goban.prototype.drawCoords = function(show) {
    this.opts.coords = show;
    this.redraw();
};

Goban.prototype.hoverAndPlace = function(
    hoverName, hoverElement,
    placeName, place, placeFun
) {
    var goban = this;
    goban.pointOver(function(pointId) {
        for(var i=0; i<goban.points.length; i++) {
            var point = goban.points[i];
            goban.removeFromPoint(point.id, hoverName);
        }
        var point = goban.points[pointId];
        if(point.elements[placeName]) {
            return;
        }
        var tile = 'b';
        var hover = hoverElement();
        hover.click(function() {
            goban.removeFromPoint(pointId, hoverName);
            var placed = place();
            goban.addToPoint(pointId, placeName, placed.element, placed.stone);

            var ret = placeFun.call(this, pointId, placed.stone);
            if(ret === false) {
                goban.addToPoint(pointId, hoverName, hoverElement());
                goban.removeFromPoint(pointId, placeName, true);
            }
        });
        goban.addToPoint(pointId, hoverName, hover);
    });
    goban.pointOut(function() {
        for(var i=0; i<goban.points.length; i++) {
            var point = goban.points[i];
            goban.removeFromPoint(point.id, hoverName);
        }
    });
};


Goban.prototype.size = function() {
    return Math.sqrt(this.opts.geometry.points.length);
};

Goban.prototype.addToPoint = function(id, name, element, stoneValue) {
    var point = this.points[id];
    if(point.elements[name]) {
        this.removeFromPoint(id, name);
    }
    var diameter = point.radius * 2;
    element.width(diameter);
    element.height(diameter);
    element.css({
        left: point.x - point.radius - 0.5,
        top: point.y - point.radius - 0.5
    });
    point.elements[name] = element;
    if(stoneValue !== undefined) {
        point.stoneValue = stoneValue;
    }
    this.element.append(element);
};
Goban.prototype.removeFromPoint = function(id, name, andStoneValue) {
    var point = this.points[id];
    if(!point.elements[name]) return;
    point.elements[name].remove();
    if(andStoneValue) {
        delete point.stoneValue;
    }
    delete point.elements[name];
};
Goban.prototype.removeFromAllPoints = function(name) {
    var removed = [];
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
        for(var k in point.elements) {
            if(k == name) {
                this.removeFromPoint(point.id, name);
                removed.push(point.id);
            }
        }
    }
    return removed;
};

Goban.prototype.coordToPoint = function(coord) {
    var numPoints = this.points.length;
    var root = Math.sqrt(numPoints);
    var letter = coord.substr(0, 1);
    var number = parseInt(coord.substr(1));
    var x = Goban.letters.indexOf(letter);
    var y = root - number;
    var point = (y)*root + x;
    return point;
}
Goban.prototype.pointToXY = function(point) {
    var numPoints = this.points.length;
    var root = Math.sqrt(numPoints);
    var x = point % root;
    var number = root - ((point - (point % root)) / root);
    return {x:x, y:number-1};
};


Goban.prototype.repositionPoint = function(point) {
    for(var k in point.elements) {
        this.repositionElement(point.elements[k], point);
    }
};
Goban.prototype.repositionElement = function(el, point) {
    var diameter = (point.radius * 2) + 1;
    el.remove(); // weird resize fix - only likes to be resized while not on the page
    el.width(diameter);
    el.height(diameter);
    var left = (point.x - point.radius) - 0.5;
    var top = (point.y - point.radius) - 0.5;
    var fontSize = point.radius;
    el.css({
        fontSize: fontSize+'px',
        lineHeight: diameter+'px',
        left: left,
        top: top
    });
    this.element.append(el); // weird resize fix
};
Goban.prototype.recalculateSize = function() {
    this.width = this.element.parent().width();
    this.height = this.element.parent().height();
    this.element.css({
        width: this.width,
        height: this.height
    });
    this.canvas.attr('width', this.width);
    this.canvas.attr('height', this.height);

    this.opts.drawer.recalculateSize(this);
};

Goban.prototype.fit = function() {
    this.recalculateSize();
    this.redraw();
}

Goban.prototype.getPoint = function(x, y) {
    // todo: sort points by x and y coord
    // so we when when to stop searching
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i]
        var hitArea = point.hitArea;
        if(x >= hitArea.x && y >= hitArea.y
           && x <= hitArea.x2 && y <= hitArea.y2)
       {
           return point;
       }
    }
    return false;
};


Goban.drawer = function(opts) {
    this.opts = $.extend(Goban.drawer.defaultOpts, opts ? opts : {});
}
Goban.drawer.defaultOpts = {
    coords: true,
    strokeStyle: '#333',
    starStyle: '#333',
    stars: true
};
Goban.drawer.prototype.recalculateSize = function(goban) {
    this.recalculatePointPositions(goban);
    this.recalculatePointRadius(goban);
};
Goban.drawer.prototype.recalculatePointRadius = function(goban) {
    var minDistance = false;
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
        for(var j=0; j<point.neighbours.length; j++) {
            var neighbour = goban.points[point.neighbours[j]];
            var diffx = Math.abs(point.x - neighbour.x);
            var diffy = Math.abs(point.y - neighbour.y);
            var distance = Math.sqrt(diffx*diffx + diffy*diffy);
            minDistance = minDistance===false ? distance : Math.min(minDistance, distance);
        }
    }
    var pointRadius = minDistance / 2;
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
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
        goban.repositionPoint(point);
    }
};

Goban.drawer.prototype.recalculatePointPositions = function(goban) {
    var padding = goban.width*0.05;
    var doublePadding = (this.opts.coords ? padding : 0)*2;
    var ratioX = (goban.width-doublePadding) / goban.opts.geometry.width;
    var ratioY = (goban.height-doublePadding) / goban.opts.geometry.height;
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
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
        point.x += this.opts.coords ? padding : 0;
        point.y += this.opts.coords ? padding : 0;
        /*point.radius = point.originalRadius * ratio;
          point.hitArea.x = point.originalHitArea.x * ratio;
          point.hitArea.y = point.originalHitArea.y * ratio;
          point.hitArea.x2 = point.originalHitArea.x2 * ratio;
          point.hitArea.y2 = point.originalHitArea.y2 * ratio;
          */
        goban.repositionPoint(point);
    }
}
Goban.drawer.prototype.redraw = function(goban) {
    var ctx = goban.ctx;
    //ctx.translate(0.5, 0.5);
    ctx.strokeStyle = this.opts.strokeStyle;
    ctx.fillStyle = this.opts.strokeStyle;
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, goban.width, goban.height);
    var lines = {};
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
        if(this.opts.coords) {
            var fontSize = point.radius;
            ctx.font = fontSize+"px Arial";
            var xy = goban.pointToXY(point.id);
            if(xy.y+1 == goban.size() || xy.y == 0) {
                var coordLetter = Goban.xToCoordLetter(xy.x);
                var metrics = ctx.measureText(coordLetter);
                var x = point.x - (metrics.width/2);
                var offset = xy.y == 0 ? point.radius+(fontSize*1.05) : 0-point.radius-(fontSize*0.2)-2;
                var y = point.y + offset;
                ctx.fillText(coordLetter, x, y);
            }
            if(xy.x+1 == goban.size() || xy.x == 0) {
                var number = xy.y+1+''
                var metrics = ctx.measureText(number);
                var halfWidth = metrics.width/2;
                var halfRadius = point.radius/2;
                var offset = xy.x == 0 ? -(point.radius*1.2)-halfRadius-2 : (point.radius*1.2)+halfRadius;
                var x = point.x + offset - halfWidth;
                var y = point.y+(fontSize/3);
                ctx.fillText(xy.y+1, x, y);
            }
        }

        if(point.hasStar && this.opts.stars) {
            ctx.beginPath();
            ctx.arc(point.x-0.5, point.y-0.5, point.radius*0.25, 0, 2 * Math.PI, false);
            ctx.fillStyle = this.opts.starStyle;
            ctx.fill();
            ctx.fillStyle = this.opts.strokeStyle;
        }

        for(var j=0; j<point.neighbours.length; j++) {
            var neighbour = goban.points[point.neighbours[j]];
            var key = Math.min(point.id, neighbour.id)
            + 'x' + Math.max(point.id, neighbour.id);
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
}



Goban.geometry = {
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

Goban.utils = {};
Goban.utils.deepEquals = function(a, b) {
    var type = typeof(a);
    if(type != typeof(b)) {
        return false;
    }
    if(type == 'object') {
        if(a.length !== b.length) {
            return false
        }
        if(a.length === undefined) {
            var aKeys = Object.keys(a);
            var bKeys = Object.keys(b);
            if(Object.keys(a).length != Object.keys(b).length) {
                return false;
            }
            for(var k in a) {
                if(!Goban.utils.deepEquals(a[k], b[k])) {
                    return false;
                }
            }
            return true;
        } else {
            for(var i=0; i<a.length; i++) {
                if(!Goban.utils.deepEquals(a[i], b[i])) {
                    return false;
                }
            }
            return true;
        }

    }
    return a == b;
};
