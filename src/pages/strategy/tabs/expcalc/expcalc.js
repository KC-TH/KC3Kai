(function(){
	"use strict";

	KC3StrategyTabs.expcalc = new KC3StrategyTab("expcalc");

	KC3StrategyTabs.expcalc.definition = {
		tabSelf: KC3StrategyTabs.expcalc,
		goals: {},
		mapexp: [],
		maplist: {},
		shipexp: {},
		goalTemplates: [], // to be initialized in "init"

		rankNames: ["F", "E", "D", "C", "B", "A", "S", "SS" ],
		rankFactors: [0, 0.5, 0.7, 0.8, 1, 1, 1.2],

		/* INIT
		Prepares all data needed
		---------------------------------*/
		init :function(){
			// Check for saved grind data
			if(typeof localStorage.goals != "undefined"){
				this.goals = JSON.parse(localStorage.goals);
			}

			// Get map exp rewards
			this.mapexp = JSON.parse($.ajax({
				url : '../../../../data/exp_map.json',
				async: false
			}).responseText);

			var self = this;
			$.each(this.mapexp, function(worldNum, mapNums){
				$.each(mapNums, function(mapNum, mapExp){
					if(mapExp > 0){
						self.maplist[worldNum+"-"+(mapNum+1)] = mapExp;
					}
				});
			});

			this.goalTemplates = GoalTemplateManager.load();
			console.log(this.maplist);
		},

		/* EXECUTE
		Places data onto the interface
		---------------------------------*/
		execute :function(){
			var self = this;
			// Add map list into the factory drop-downs
			$.each(this.maplist, function(MapName, MapExp){
				$(".tab_expcalc .factory .ship_map select").append("<option>"+MapName+"</option>");
				$(".tab_expcalc .factory .goal_map select").append("<option>"+MapName+"</option>");
			});

			var editingBox, mapSplit;

			// Edit Button
			$(".tab_expcalc .box_goals").on("click", ".ship_edit", function(){
				editingBox = $(this).parent();
				var grindData = self.goals[ "s"+editingBox.data("id") ];

				$(".ship_target input", editingBox).val( grindData[0] );
				$(".ship_map select", editingBox).val( grindData[1]+"-"+grindData[2] );
				$(".ship_rank select", editingBox).val(	 grindData[4] );
				$(".ship_fs input", editingBox).prop("checked", grindData[5]);
				$(".ship_mvp input", editingBox).prop("checked", grindData[6]);

				$(".ship_value" , editingBox).hide();
				$(".ship_input" , editingBox).show();

				$(".ship_edit" , editingBox).hide();
				$(".ship_save" , editingBox).show();
			});

			// Save Button
			$(".tab_expcalc .box_goals").on("click", ".ship_save", function(){
				editingBox = $(this).parent();

				mapSplit = $(".ship_map select", editingBox).val().split("-");
				console.log("mapSplit", mapSplit);
				self.goals["s"+ editingBox.data("id") ] = [
					/*0*/ parseInt($(".ship_target input", editingBox).val(), 10), // target level
					/*1*/ parseInt(mapSplit[0], 10), // world
					/*2*/ parseInt(mapSplit[1], 10), // map
					/*3*/ 0, // node
					/*4*/ parseInt($(".ship_rank select", editingBox).val(), 10), // battle rank
					/*5*/ $(".ship_fs input", editingBox).prop("checked")?1:0, // flagship
					/*6*/ $(".ship_mvp input", editingBox).prop("checked")?1:0 // mvp
				];

				self.save();

				self.recompute( editingBox.data("id") );

				$(".ship_value" , editingBox).show();
				$(".ship_input" , editingBox).hide();

				$(".ship_edit" , editingBox).show();
				$(".ship_save" , editingBox).hide();
			});

			// Add to Goals Button
			$(".tab_expcalc").on("click", ".ship_add", function(){
				editingBox = $(this).parent();
				self.goals["s"+ editingBox.data("id") ] = [];
				self.save();
				//window.location.reload();

				$(".ship_edit", editingBox).show();
				$(".ship_rem", editingBox).show();
				editingBox.removeClass("inactive");
				editingBox.appendTo(".tab_expcalc .box_goals");
				self.recompute( editingBox.data("id") );
			});

			function goalTemplateSetupUI(tdata, goalBox) {
				var mapStr = tdata.map.join("-");

				// "show" mode
				$(".goal_type .goal_value",goalBox)
					.text( GoalTemplateManager.showSType(tdata.stype) );
				$(".goal_map .goal_value",goalBox).text( mapStr );
				$(".goal_rank .goal_value",goalBox).text( self.rankNames[tdata.rank] );
				$(".goal_fs .goal_value",goalBox).text( tdata.flagship? "Yes":"No" );
				$(".goal_mvp .goal_value",goalBox).text( tdata.mvp? "Yes":"No" );

				// "edit" mode
				$(".goal_type input",goalBox)
					.val( GoalTemplateManager.showInputSType(tdata.stype) );
				$(".goal_map select",goalBox).val( mapStr );
				$(".goal_rank select",goalBox).val( tdata.rank );
				$(".goal_fs input", goalBox).prop("checked", tdata.flagship);
				$(".goal_mvp input", goalBox).prop("checked", tdata.mvp);

				// enable / disable
				if (! tdata.enable) {
					goalBox.addClass("disabled");
				} else {
					goalBox.removeClass("disabled");
				}
				$(".goal_onoff", goalBox).text( tdata.enable? "Enabled":"Disabled");
			}

			function goalTemplateEdit(t) {
				$(".goal_edit",t).hide();
				$(".goal_save",t).show();

				$(".goal_col .goal_value",t).hide();
				$(".goal_col .goal_input",t).show();
				$(".manage_buttons",t).hide();
			}

			function goalTemplateShow(t) {
				$(".goal_edit",t).show();
				$(".goal_save",t).hide();

				$(".goal_col .goal_value",t).show();
				$(".goal_col .goal_input",t).hide();
				$(".manage_buttons",t).show();
			}

			function goalTemplateRemove(t) {
				var ind = t.index();
				self.goalTemplates.splice(ind,1);
				GoalTemplateManager.save( self.goalTemplates );
				t.remove();
			}

			// swap two templates, make sure abs(index1 - index2) == 1
			// and index1 is a valid index (index2 doesn't have to be)
			function goalTemplateSwap(index1,index2) {
				if (Math.abs(index1 - index2) == 1) {
					if (index2 >= 0 && index2 < self.goalTemplates.length) {
						// swap data
						var tmp = self.goalTemplates[index1];
						self.goalTemplates[index1] = self.goalTemplates[index2];
						self.goalTemplates[index2] = tmp;
						GoalTemplateManager.save( self.goalTemplates );
						// setup UI
						var cs = $(".box_goal_templates").children();
						goalTemplateSetupUI(self.goalTemplates[index1],
											$(cs[index1]) );
						goalTemplateShow(cs[index1]);
						goalTemplateSetupUI(self.goalTemplates[index2],
											$(cs[index2]));
						goalTemplateShow(cs[index2]);
					}
				}
			}

			// for saving modification
			function goalTemplateSave(t) {
				var stypeRaw = $(".goal_type input",t).val();
				var stype = GoalTemplateManager.parseSType( stypeRaw );
				var mapRaw = $(".goal_map select",t).val();
				var map = mapRaw.split("-").map(function (x) { return parseInt(x,10); });
				var rankNum = parseInt($(".goal_rank select", t).val(), 10);
				var flagship = $(".goal_fs input", t).prop("checked");
				var mvp = $(".goal_mvp input", t).prop("checked");

				var obj = self.goalTemplates[t.index()];
				var result = {
					stype: stype,
					map: map,
					rank: rankNum,
					flagship: flagship,
					mvp: mvp };
				// use extend to make sure "enable" field is properly kept
				self.goalTemplates[t.index()] = $.extend(obj, result);
				GoalTemplateManager.save( self.goalTemplates );
			}

			function goalTemplateToggle(t) {
				var ind = t.index();
				var obj = self.goalTemplates[ind];
				obj.enable = ! obj.enable;
				GoalTemplateManager.save( self.goalTemplates );
				goalTemplateSetupUI( self.goalTemplates[ind], t);
			}

			// Goal Template Edit & Save button events
			$(".tab_expcalc").on("click", ".goal_template .goal_edit", function() {
				var goalBox = $(this).parent().parent();
				goalTemplateEdit(goalBox);
			});

			$(".tab_expcalc").on("click", ".goal_template .goal_save", function() {
				var goalBox = $(this).parent().parent();
				goalTemplateSave(goalBox);
				goalTemplateSetupUI(self.goalTemplates[ goalBox.index() ], goalBox);
				goalTemplateShow(goalBox);
			});

			$(".tab_expcalc").on("click", ".goal_template .goal_rem", function() {
				var goalBox = $(this).parent().parent();
				goalTemplateRemove(goalBox);
			});


			$(".tab_expcalc").on("click", ".goal_template .goal_up", function() {
				var goalBox = $(this).parent().parent();
				var ind = goalBox.index();
				goalTemplateSwap(ind, ind-1);
			});

			$(".tab_expcalc").on("click", ".goal_template .goal_down", function() {
				var goalBox = $(this).parent().parent();
				var ind = goalBox.index();
				goalTemplateSwap(ind, ind+1);
			});

			$(".tab_expcalc").on("click", ".goal_template .goal_onoff", function() {
				var goalBox = $(this).parent().parent();
				goalTemplateToggle(goalBox);
			});

			$(".tab_expcalc").on("click", ".goal_template .goal_filter", function() {
				var goalBox = $(this).parent().parent();
				var stypes = self.goalTemplates[goalBox.index()].stype;
				// if there's an "Any" filter, don't proceed because
				// we will end up highlighting everything
				if (stypes.indexOf("*") != -1)
					return true;

				var KGS = PS["KanColle.Generated.SType"];
				var stypeIds = stypes.map( function(x) {
					return KGS.toInt(KGS.readSType(x));
				});

				// traverse all ships, toggle "highlight" flag
				$(".section_body .ship_goal").each( function(i,x) {
					var jqObj = $(x);
					var rosterId = jqObj.data("id");
					var ThisShip = KC3ShipManager.get( rosterId );
					var MasterShip = ThisShip.master();
					var stypeId = MasterShip.api_stype;

					if (stypeIds.indexOf(stypeId) != -1) {
						jqObj.addClass("highlight");
					} else {
						jqObj.removeClass("highlight");
					}
				});
			});

			$(".tab_expcalc").on("click", ".goal_template .goal_apply", function() {
				var goalBox = $(this).parent().parent();
				var template = self.goalTemplates[goalBox.index()];

				var targetShips = [];
				$(".tab_expcalc .box_goals .ship_goal").each( function(i,x) {
					var jqObj = $(x);
					var rosterId = $(x).data("id");
					var ThisShip = KC3ShipManager.get( rosterId );
					var MasterShip = ThisShip.master();
					var stypeId = MasterShip.api_stype;

					if (GoalTemplateManager.checkShipType(stypeId, template))
						targetShips.push( {
							rosterId: rosterId,
							shipDesc: 
                              ThisShip.name() + " Lv." + ThisShip.level +
                                " (" + rosterId + ")"
						}  );
				});

				// build a dialog for confirmation
				var shipsStr = targetShips.map( function(x) { return x.shipDesc; }).join("\n");
				if (! confirm( "Applying template to following ship(s): \n" + shipsStr + "\nConfirm ?"))
					return true;

				$.each( targetShips, function(i,x) {
					console.log( JSON.stringify(x) );
					var grindData = self.goals["s" + x.rosterId];
					self.goals["s" + x.rosterId] =
						GoalTemplateManager.applyTemplate(grindData, template);
					self.save();
					self.recompute( x.rosterId );
				});
			});

			// inserting into existing templates
			$.each(this.goalTemplates, function(i,x) {
				var goalBox = $(".tab_expcalc .factory .goal_template").clone();
				goalTemplateSetupUI(self.goalTemplates[i], goalBox);
				goalTemplateShow(goalBox);

				goalBox.appendTo(".tab_expcalc .box_goal_templates");
			});

			$(".tab_expcalc a.new_template").on("click", function () {
				var goalBox = $(".tab_expcalc .factory .goal_template").clone();
				var dat = GoalTemplateManager.newTemplate();
				self.goalTemplates.push(dat);
				GoalTemplateManager.save( self.goalTemplates );
				goalTemplateSetupUI(dat, goalBox);
				goalTemplateShow(goalBox);
				goalBox.addClass("disabled");
				goalBox.appendTo(".tab_expcalc .box_goal_templates");
			});

			$(".tab_expcalc a.clear_highlight").on("click", function () {
				$(".section_body .ship_goal").each( function(i,x) {
					var jqObj = $(x);
					jqObj.removeClass("highlight");
				});
			});

			// TODO: prevent double click text selection?

			// Remove from Goals Button
			$(".tab_expcalc").on("click", ".ship_rem", function(){
				editingBox = $(this).parent();
				delete self.goals["s"+ editingBox.data("id") ];
				self.save();
				//window.location.reload();

				$(".ship_save", editingBox).hide();
				$(".ship_edit", editingBox).hide();
				$(".ship_rem", editingBox).hide();
				editingBox.addClass("inactive");
				var ThisShip = KC3ShipManager.get(editingBox.data("id"));
				if(ThisShip.master().api_aftershipid > 0 && ThisShip.level<ThisShip.master().api_afterlv){
					$(".tab_expcalc .box_recommend .clear").remove();
					editingBox.appendTo(".tab_expcalc .box_recommend");
					$("<div />").addClass("clear").appendTo(".tab_expcalc .box_recommend");
				}else{
					$(".tab_expcalc .box_other .clear").remove();
					editingBox.appendTo(".tab_expcalc .box_other");
					$("<div />").addClass("clear").appendTo(".tab_expcalc .box_other");
				}
			});

			// Show all ship_save
			var goalBox;
			$.each(KC3ShipManager.list, function(index, ThisShip){
				if(!ThisShip.lock){ return true; }

				// Create the ship box
				goalBox = $(".tab_expcalc .factory .ship_goal").clone();
				goalBox.attr("id", "goalBox"+ThisShip.rosterId);
				goalBox.data("id", ThisShip.rosterId);

				// Icon and level, common for all categories
				$(".ship_icon img", goalBox).attr("src", KC3Meta.shipIcon(ThisShip.masterId) );
				$(".ship_icon img", goalBox).attr("title", ThisShip.name() + ' (' + ThisShip.rosterId + ')' );
				$(".ship_name", goalBox).text( ThisShip.name() );
				$(".ship_type", goalBox).text( ThisShip.stype() );
				$(".ship_lv .ship_value", goalBox).text( ThisShip.level );

				// If ship already on the current goals
				if(typeof self.goals["s"+ThisShip.rosterId] != "undefined"){
					$(".ship_edit", goalBox).show();
					$(".ship_rem", goalBox).show();
					goalBox.appendTo(".tab_expcalc .box_goals");

					self.recompute( ThisShip.rosterId );
					return true;
				}

				goalBox.addClass("inactive");

				// If still has next remodel, add to recommendations
				if(ThisShip.master().api_aftershipid > 0 && ThisShip.level<ThisShip.master().api_afterlv){
					$(".ship_target .ship_value", goalBox).text( ThisShip.master().api_afterlv );
					goalBox.appendTo(".tab_expcalc .box_recommend");
					return true;
				}

				// If this is the last remodel stage, add to others
				if(ThisShip.level<99){
					$(".ship_target .ship_value", goalBox).text( 99 );
				}else{
					$(".ship_target .ship_value", goalBox).text( 155 );
				}
				goalBox.appendTo(".tab_expcalc .box_other");
			});

			//this.save();

			$("<div />").addClass("clear").appendTo(".tab_expcalc .box_recommend");
			$("<div />").addClass("clear").appendTo(".tab_expcalc .box_other");
		},

		save: function(){
			localStorage.goals = JSON.stringify(this.goals);
		},

		recompute: function( rosterId ){
			var self = this;
			var goalBox = $("#goalBox"+rosterId);
			var grindData = this.goals["s"+rosterId];
			var ThisShip = KC3ShipManager.get( rosterId );
			var MasterShip = ThisShip.master();

			// This has just been added, no grinding data yet, initialize defaults
			if(grindData.length === 0){
				// As much as possible use arrays nowadays to shrink JSON size, we might run out of the 5MB localStorage allocated for our app
				grindData = [
					/*0*/ (MasterShip.api_aftershipid > 0 && ThisShip.level<MasterShip.api_afterlv)?MasterShip.api_afterlv:(ThisShip.level<99)?99:155, // target level
					/*1*/ 1, // world
					/*2*/ 1, // map
					/*3*/ 1, // node
					/*4*/ 6, // E=1 D=2 C=3 B=4 A=5 S=6 SS=7
					/*5*/ 0, // flagship
					/*6*/ 0 // mvp
				];

				var i;
				for (i=0; i<self.goalTemplates.length; ++i) {
					var template = self.goalTemplates[i];
					if (template.enable &&
						GoalTemplateManager.checkShipType(MasterShip.api_stype,template)) {
						grindData = GoalTemplateManager.applyTemplate(grindData, template);
						break;
					}
				}

				this.goals["s"+ThisShip.rosterId] = grindData;
			}else{

			}

			// Target level
			$(".ship_target .ship_value", goalBox).text( grindData[0] );

			// Experience Left
			var expLeft = KC3Meta.expShip(grindData[0])[1] - ThisShip.exp[0];
			$(".ship_exp .ship_value", goalBox).text( expLeft );

			// Base Experience: MAP
			$(".ship_map .ship_value", goalBox).text( grindData[1]+"-"+grindData[2] );
			var expPerSortie = this.maplist[ grindData[1]+"-"+grindData[2] ];

			// Exp Modifier: MVP
			$(".ship_mvp .ship_value", goalBox).text( grindData[6]?"Yes":"No" );
			$(".ship_mvp .ship_value", goalBox).css('color',(grindData[6]? "#e33" : "#039")); //yes : light red, no : deep blue
			if(grindData[6]===1){ expPerSortie = expPerSortie * 2; }

			// Exp Modifier: FLAGSHIP
			$(".ship_fs .ship_value", goalBox).text( grindData[5]?"Yes":"No" );
			$(".ship_fs .ship_value", goalBox).css('color',(grindData[5]? "#e33" : "#039")); 

			if(grindData[5]===1){ expPerSortie = expPerSortie * 1.5; }

			// Exp Modifier: RANK
			$(".ship_rank .ship_value", goalBox).text( this.rankNames[grindData[4]] );
			expPerSortie = expPerSortie * this.rankFactors[grindData[4]];

			// RESULT: Battles Left
			$(".ship_result .ship_value", goalBox).text( Math.ceil(expLeft / expPerSortie) );
		}

	};

})();
