import { eventMixin } from "./events";
import { runInOp } from "./operations";
import { addToScrollPos } from "./scrolling";
import { lineIsHidden } from "./spans";
import { changeLine, heightAtLine, lineNo, updateLineHeight } from "./utils_line";
import { regLineChange } from "./view_tracking";
import { widgetHeight } from "./utils_widgets";

// LINE WIDGETS

// Line widgets are block elements displayed above or below a line.

export function LineWidget(doc, node, options) {
  if (options) for (var opt in options) if (options.hasOwnProperty(opt))
    this[opt] = options[opt];
  this.doc = doc;
  this.node = node;
}
eventMixin(LineWidget);

function adjustScrollWhenAboveVisible(cm, line, diff) {
  if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
    addToScrollPos(cm, null, diff);
}

LineWidget.prototype.clear = function() {
  var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
  if (no == null || !ws) return;
  for (var i = 0; i < ws.length; ++i) if (ws[i] == this) ws.splice(i--, 1);
  if (!ws.length) line.widgets = null;
  var height = widgetHeight(this);
  updateLineHeight(line, Math.max(0, line.height - height));
  if (cm) runInOp(cm, function() {
    adjustScrollWhenAboveVisible(cm, line, -height);
    regLineChange(cm, no, "widget");
  });
};
LineWidget.prototype.changed = function() {
  var oldH = this.height, cm = this.doc.cm, line = this.line;
  this.height = null;
  var diff = widgetHeight(this) - oldH;
  if (!diff) return;
  updateLineHeight(line, line.height + diff);
  if (cm) runInOp(cm, function() {
    cm.curOp.forceUpdate = true;
    adjustScrollWhenAboveVisible(cm, line, diff);
  });
};

export function addLineWidget(doc, handle, node, options) {
  var widget = new LineWidget(doc, node, options);
  var cm = doc.cm;
  if (cm && widget.noHScroll) cm.display.alignWidgets = true;
  changeLine(doc, handle, "widget", function(line) {
    var widgets = line.widgets || (line.widgets = []);
    if (widget.insertAt == null) widgets.push(widget);
    else widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget);
    widget.line = line;
    if (cm && !lineIsHidden(doc, line)) {
      var aboveVisible = heightAtLine(line) < doc.scrollTop;
      updateLineHeight(line, line.height + widgetHeight(widget));
      if (aboveVisible) addToScrollPos(cm, null, widget.height);
      cm.curOp.forceUpdate = true;
    }
    return true;
  });
  return widget;
}
