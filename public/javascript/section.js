define(["class"], function(Class) {

	var Section = Class.extend({
		id: null,
		element: null,
		_visible: null,

		init: function() {
			this.element = document.getElementById(this.id);
			this._visible = false;
		},

		show: null,
		hide: null,

		afterShow: function() {
			this.element.style.display = "block";
			this._visible = true;
		},

		afterHide: function() {
			this.element.style.display = "";
			this._visible = false;
		}

	});

	return Section;
});