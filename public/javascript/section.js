define(["class"], function(Class) {

	var Section = Class.extend({
		id: null,
		element: null,
		_visible: null,

		init: function() {
			if (this.id) {
				this.element = document.getElementById(this.id);
			}

			this._visible = false;
		},

		setElement: function(element) {
			this.element = element;
		},

		show: null,
		hide: null,

		afterShow: function() {
			if (this.element) {
				this.element.style.display = "block";
			}

			this._visible = true;
		},

		afterHide: function() {
			if (this.element) {
				this.element.style.display = "";
			}

			this._visible = false;
		}

	});

	return Section;
});