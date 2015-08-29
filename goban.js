var Goban = function(opts) {
    this.opts = $.extend(Goban.defaultOpts, opts ? opts : {});
    this.element = $('<div class="goban"></div>');
    this.canvas = $('<canvas width="'+opts.width+'" height="'+opts.height+'"></canvas>');
    this.element.append(this.canvas);
    this.ctx = this.canvas.get(0).getContext('2d');
    this.points = [];
    this.callbacks = {
        pointOver: $.Callbacks(),
        pointOut: $.Callbacks()
    };

    var points = this.points;
    var size = this.size();
    (function() {
        for(var i=0; i<opts.geometry.points.length; i++) {
            var optPoint = opts.geometry.points[i];
            var x = optPoint[0];
            var y = optPoint[1];
            var neighbours = optPoint[2];
            point = {
                id: i,
                neighbours: neighbours,
                elements: {}
            };
            //point.value = valueFun(point);
            //point.connected = connectedFun(point);
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
    })();
};

Goban.defaultOpts = {
    strokeStyle: '#333',
    starStyle: '#333',
    drawStars: true
};

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

Goban.prototype.showCoords = function(show) {
    this.opts.showCoords = show;
    this.redraw();
};

Goban.prototype.hoverPlaceAndFocus = function(
    hoverName, hoverElement,
    placeName, placeElement,
    focusName, focusElement, placeFun
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
        console.log(point.id);
        var tile = 'b';
        var hover = hoverElement();
        hover.click(function() {
            goban.removeFromAllPoints(focusName);

            goban.removeFromPoint(pointId, hoverName);
            goban.addToPoint(pointId, placeName, placeElement());
            goban.addToPoint(pointId, focusName, focusElement());
            placeFun.call(this, pointId);
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

Goban.prototype.addToPoint = function(id, name, element) {
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
    this.element.append(element);
};
Goban.prototype.removeFromPoint = function(id, name) {
    var point = this.points[id];
    if(!point.elements[name]) return;
    point.elements[name].remove();
    delete point.elements[name];
};
Goban.prototype.removeFromAllPoints = function(name) {
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
        for(var k in point.elements) {
            if(k == name) {
                this.removeFromPoint(point.id, name);
            }
        }
    }
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

Goban.prototype.recalculatePointPositions = function() {
    var padding = this.width*0.05;
    var doublePadding = (this.opts.showCoords ? padding : 0)*2;
    var ratioX = (this.width-doublePadding) / this.opts.geometry.width;
    var ratioY = (this.height-doublePadding) / this.opts.geometry.height;
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
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
        point.x += this.opts.showCoords ? padding : 0;
        point.y += this.opts.showCoords ? padding : 0;
        /*point.radius = point.originalRadius * ratio;
          point.hitArea.x = point.originalHitArea.x * ratio;
          point.hitArea.y = point.originalHitArea.y * ratio;
          point.hitArea.x2 = point.originalHitArea.x2 * ratio;
          point.hitArea.y2 = point.originalHitArea.y2 * ratio;
          */
        this.repositionPoint(point);
    }
}


Goban.prototype.recalculatePointRadius = function() {
    var minDistance = false;
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
        for(var j=0; j<point.neighbours.length; j++) {
            var neighbour = this.points[point.neighbours[j]];
            var diffx = Math.abs(point.x - neighbour.x);
            var diffy = Math.abs(point.y - neighbour.y);
            var distance = Math.sqrt(diffx*diffx + diffy*diffy);
            minDistance = minDistance===false ? distance : Math.min(minDistance, distance);
        }
    }
    var pointRadius = minDistance / 2;
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
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
        this.repositionPoint(point);
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
    this.recalculatePointPositions();
    this.recalculatePointRadius();
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

Goban.prototype.redraw = function() {
    var ctx = this.ctx;
    //ctx.translate(0.5, 0.5);
    ctx.strokeStyle = this.opts.strokeStyle;
    ctx.fillStyle = this.opts.strokeStyle;
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, this.element.width(), this.element.height());
    var lines = {};
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
        if(this.opts.showCoords) {
            var fontSize = point.radius;
            ctx.font = fontSize+"px Arial";
            var xy = this.pointToXY(point.id);
            if(xy.y+1 == this.size() || xy.y == 0) {
                var coordLetter = Goban.xToCoordLetter(xy.x);
                var metrics = ctx.measureText(coordLetter);
                var x = point.x - (metrics.width/2);
                var offset = xy.y == 0 ? point.radius+(fontSize*1.05) : 0-point.radius-(fontSize*0.2)-2;
                var y = point.y + offset;
                ctx.fillText(coordLetter, x, y);
            }
            if(xy.x+1 == this.size() || xy.x == 0) {
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

        if(point.hasStar && this.opts.drawStars) {
            ctx.beginPath();
            ctx.arc(point.x-0.5, point.y-0.5, point.radius*0.25, 0, 2 * Math.PI, false);
            ctx.fillStyle = this.opts.starStyle;
            ctx.fill();
            ctx.fillStyle = this.opts.strokeStyle;
        }

        for(var j=0; j<point.neighbours.length; j++) {
            var neighbour = this.points[point.neighbours[j]];
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
