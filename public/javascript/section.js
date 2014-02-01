define(["class"], function(Class) {

	var Section = Class.extend({
		id: null,
		element: null,

		init: function() {
			this.element = document.getElementById(this.id);
		},

		show: null,
		hide: null,

		afterShow: function() {
			this.element.style.display = "block";
		},

		afterHide: function() {
			this.element.style.display = "";
		}

	});

	return Section;
});