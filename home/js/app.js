/**
 * EGroupware - Home - Javascript UI
 *
 * @link http://www.egroupware.org
 * @package home
 * @author Nathan Gray
 * @copyright (c) 2013 Nathan Gray
 * @license http://opensource.org/licenses/gpl-license.php GPL - GNU General Public License
 * @version $Id$
 */

"use strict";

/*egw:uses
        jquery.jquery;
        jquery.jquery-ui;
	/phpgwapi/js/jquery/gridster/jquery.gridster.js;
*/

/**
 * JS for home application
 *
 * Home is a collection of little bits of content (portlets) from the other applications.
 *
 *
 * Uses Gridster for the grid layout
 * @see http://gridster.net
 * @augments AppJS
 */
app.classes.home = AppJS.extend(
{
	/**
	 * AppJS requires overwriting this with the actual application name
	 */
	appname: "home",

	/**
	 * Grid resolution.  Must match et2_portlet GRID
	 */
	GRID: 50,

	/**
	 * Default size for new portlets
	 */
	DEFAULT: {
		WIDTH:	2,
		HEIGHT:	1
	},

	/**
	 * Constructor
	 *
	 * @memberOf app.home
	 */
	init: function()
	{
		// call parent
		this._super.apply(this, arguments);
	},

	/**
	 * Destructor
	 * @memberOf app.home
	 */
	destroy: function()
	{
		delete this.et2;
		delete this.portlet_container;

		// call parent
		this._super.apply(this, arguments);
	},

	/**
	 * This function is called when the etemplate2 object is loaded
	 * and ready.  If you must store a reference to the et2 object,
	 * make sure to clean it up in destroy().
	 *
	 * @param et2 etemplate2 Newly ready object
	 */
	et2_ready: function(et2)
	{
		// call parent
		this._super.apply(this, arguments);

		this.portlet_container = this.et2.getWidgetById("portlets");

		// Don't do twice
		if(this.portlet_container._children.length > 0) return;

		// Add portlets
		var content = this.et2.getArrayMgr("content").getEntry("portlets");
		var modifications = this.et2.getArrayMgr("modifications").getEntry("portlets");
		for(var key in content)
		{
			//var attrs = jQuery.extend({id: key}, content[key], modifications[key]);
			var attrs = {id: key};
			var portlet = et2_createWidget('portlet',attrs, this.portlet_container);
		}
		this.et2.loadingFinished();

		// Set up sorting of portlets
		this._do_ordering();
	},

	/**
	 * Add a new portlet from the context menu
	 */
	add: function(action, source) {
		// Put it in the last row, first column, since the mouse position is unknown
		var max_row = Math.max.apply(null,$j('div',this.portlet_container.div).map(function() {return $j(this).attr('data-row');}));
		var attrs = {id: this._create_id(), row: max_row + 1, col: 1};

		var portlet = et2_createWidget('portlet',attrs, this.portlet_container);
		portlet.loadingFinished();

		// Get actual attributes & settings, since they're not available client side yet
		portlet._process_edit(et2_dialog.OK_BUTTON, {class: action.id});

		// Set up sorting/grid of new portlet
		var $portlet_container = $j(this.portlet_container.getDOMNode());
		$portlet_container.data("gridster").add_widget(
			portlet.getDOMNode(),
			this.DEFAULT.WIDTH, this.DEFAULT.HEIGHT,
			attrs.col, attrs.row
		);
	},

	/**
	 * User dropped something on home.  Add a new portlet
	 */
	add_from_drop: function(action,source,target_action) {

		// Actions got confused drop vs popup
		if(source[0].id == 'portlets')
		{
			return this.add(action);
		}

		var $portlet_container = $j(this.portlet_container.getDOMNode());

		// Basic portlet attributes
		var attrs = {id: this._create_id()};

		// Try to find where the drop was
		if(action != null && action.ui && action.ui.position)
		{
			attrs.row = Math.round((action.ui.offset.top - $portlet_container.offset().top )/ this.GRID);
			attrs.col = Math.max(0,Math.round((action.ui.offset.left - $portlet_container.offset().left) / this.GRID)-1);
		}

		var portlet = et2_createWidget('portlet',attrs, this.portlet_container);
		portlet.loadingFinished();

		// Get actual attributes & settings, since they're not available client side yet
		var drop_data = [];
		for(var i = 0; i < source.length; i++)
		{
			if(source[i].id) drop_data.push(source[i].id);
		}
		portlet._process_edit(et2_dialog.OK_BUTTON, {dropped_data: drop_data, class: action.id.substr(5)});

		// Set up sorting/grid of new portlet
		$portlet_container.data("gridster").add_widget(
			portlet.getDOMNode(),
			this.DEFAULT.WIDTH, this.DEFAULT.HEIGHT,
			attrs.col, attrs.row
		);
	},

	/**
	 * For link_portlet - opens the configured record when the user
	 * double-clicks or chooses view from the context menu
	 */
	open_link: function(action) {

		// Get widget
		var widget = null;
		while(action.parent != null)
		{
			if(action.data && action.data.widget)
			{
				widget = action.data.widget;
				break;
			}
			action = action.parent;
		}
		if(widget == null)
		{
			egw().log("warning", "Could not find widget");
			return;
		}
		egw().open(widget.options.settings.entry, "", 'edit');
	},

	/**
	 * For list_portlet - adds a new link
	 * This is needed here so action system can find it
	 */
	add_link: function(action,source,target_action) {
		this.List.add_link(action, source, target_action);
	},

	/**
	 * Set up the drag / drop / re-order of portlets
	 */
	_do_ordering: function() {
		var $portlet_container = $j(this.portlet_container.getDOMNode());
		$portlet_container
			.addClass("home ui-helper-clearfix")
			.disableSelection()
			/* Gridster */
			.gridster({
				widget_selector: 'div.et2_portlet',
				// Dimensions + margins = grid spacing
				widget_base_dimensions: [this.GRID-5, this.GRID-5],
				widget_margins: [5,5],
				extra_rows: 1,
				extra_cols: 1,
				min_cols: 3,
				min_rows: 3,
				/**
				 * Set which parameters we want when calling serialize().
				 * @param $w jQuery jQuery-wrapped element
				 * @param grid Object Grid settings
				 * @return Object - will be returned by gridster.serialize()
				 */
				serialize_params: function($w, grid) {
					return {
						id: $w.attr("id"),
						row: grid.row,
						col: grid.col,
						width: grid.width,
						height: grid.height
					};
				},
				/**
				 * Gridster's internal drag settings
				 */
				draggable: {
					handle: '.ui-widget-header',
					stop: function(event,ui) {
						// Update widget(s)
						var changed = this.serialize_changed();
						for (var key in changed)
						{
							if(!changed[key].id) continue;
							// Changed ID is DOM id
							var widget_id = changed[key].id.substr(window.app.home.et2.getInstanceManager().uniqueId.length + 1);
							var widget = window.app.home.portlet_container.getWidgetById(widget_id);
							if(!widget || widget == window.app.home.portlet_container) continue;

							egw().jsonq("home.home_ui.ajax_set_properties",[widget.id, widget.options.settings,{
									row: changed[key].row,
									col: changed[key].col
								}],
								null,
								widget, true, widget
							);
						}
					}
				}

			});

		// Bind resize to update gridster - this may happen _before_ the widget gets a
		// chance to update itself, so we can't use the widget
		$portlet_container
			.on("resizestop", function(event, ui) {
				$portlet_container.data("gridster").resize_widget(
					ui.element,
					Math.round(ui.size.width / app.home.GRID),
					Math.round(ui.size.height / app.home.GRID)
				);
			});
	},

	/**
	 * Create an ID that should be unique, at least amoung a single user's portlets
	 */
	_create_id: function() {
		var id = '';
		do
		{
			id = Math.floor((1 + Math.random()) * 0x10000)
			     .toString(16)
			     .substring(1);
		}
		while(this.portlet_container.getWidgetById(id));
		return id;
	},

	/**
	 * Functions for the list portlet
	 */
	List:
	{
		/**
		 * List uses mostly JS to generate its content, so we just do it on the JS side by
		 * returning a call to this function as the HTML content.
		 *
		 * @param id String The ID of the portlet
		 * @param list_values Array List of information passed to the link widget
		 */
		set_content: function(id, list_values)
		{
			try {
				var portlet = app.home.portlet_container.getWidgetById(id);
			} catch(e) {
				egw.debug("log", "Tried to set home list content with no etemplate");
				return;
			};
			if(portlet != null)
			{
				var list = portlet.getWidgetById(id+'-list');
				if(list)
				{
					// List was just rudely pulled from DOM by the call to HTML, put it back
					portlet.content.append(list.getDOMNode());
				}
				else
				{
					// Create widget
					list = et2_createWidget('link-list', {id: id+'-list'}, portlet);
					list.doLoadingFinished();
					// Abuse link list by overwriting delete handler
					list._delete_link = app.home.List.delete_link;
				}
				list.set_value(list_values);

				// Disable link list context menu
				$j('tr',list.list).unbind('contextmenu');

				// Allow scroll bars
				portlet.content.css('overflow', 'auto');
			}
		},


		/**
		 * For list_portlet - opens a dialog to add a new entry to the list
		 */
		add_link: function(action, source, target_action) {
			// Actions got confused drop vs popup
			if(source[0].id == 'portlets')
			{
				return this.add_link(action);
			}

			// Get widget
			var widget = null;
			while(action.parent != null)
			{
				if(action.data && action.data.widget)
				{
					widget = action.data.widget;
					break;
				}
				action = action.parent;
			}
			if(target_action == null)
			{
				var link = et2_createWidget('link-entry', {label: this.egw.lang('Add')}, this.portlet_container);
				var dialog = et2_dialog.show_dialog(
					function(button_id) {
						if(button_id == et2_dialog.CANCEL_BUTTON) return;
						var new_list = widget.options.settings.list || [];
						var add = link.getValue();
						link.destroy();
						for(var i = 0; i < new_list.length; i++)
						{
							if(new_list[i].app == add.app && new_list[i].id == add.id)
							{
								// Duplicate
								return;
							}
						}

						new_list.push(add);
						widget._process_edit(button_id,{list: new_list});
					},
					'Add',
					this.egw.lang('Add'), {},
					et2_dialog.BUTTONS_OK_CANCEL
				);
				dialog.set_message(link.getDOMNode());
			}
			else
			{
				// Drag'n'dropped something on the list - just send action IDs
				var drop_data = [];
				for(var i = 0; i < source.length; i++)
				{
					if(source[i].id) drop_data.push(source[i].id);
				}
				widget._process_edit(et2_dialog.BUTTONS_OK_CANCEL,{
					list: widget.options.settings.list || {},
					dropped_data: drop_data
				});
			}
		},

		/**
		 * Remove a link from the list
		 */
		delete_link: function(undef, row) {
			// Quick response
			row.slideUp(row.remove);
			// Actual removal
			this._parent.options.settings.list.splice(row.index(), 1);
			this._parent._process_edit(et2_dialog.OK_BUTTON,{list: this._parent.options.settings.list || {}});
		}
	}
});
