/**
 * Sudoku generator & solver.
 *
 * @author mmizera@gmail.com 
 * @reason bored after xmass
 *
 */
var sudoku = (function(m) {

	// if(!m.submodule) m.submodule = {};

	// helpers


	var each = function(f, c) {
		if(Array.isArray(f)) {
			for(var i =0, j = f.length; i < j; i++) {
				if(c(f[i], i, f))
					break;
			}

			return;
		}

		// object
		for(var i in f) {
			if(!f.hasOwnProperty(f[i])) continue;

			if(c(f[i], i, f))
				break;
		}
	};

	var randInt = function(low, high) {
		return Math.floor(Math.random()* (high+1-low)) + low;
	};

	Array.filter = function(callback) {
		var result = [];
		for(var i=0, j = this.length; i < j; i++) {
			if(callback(this[i])) {
				result[i] = this[i];
			}
		}

		return result;
	};

	Array.prototype.itemsCount = function(item) {
		var result = 0;
		for(var i=0, j = this.length; i < j; i++) {
			if(this[i] === item) {
				result++;
			}
		}

		return result;
	};

	var field = [];

	var unassignedIndexes = [];

	m.getField = function() {
		return field;
	}

	m.setField = function($field) {
		if(typeof($field) === 'string') $field = parseSudokuFromString($field);
		if(!Array.isArray($field)) throw new Error("Not a field. " + typeof($field));
		field = $field;
	}

	var parseSudokuFromString = function(str) {
		var field = [];

		str = str.trim();

		for(var i = 0, j = str.length; i < j; i++) {
			var item = str[i];
			if(item == ' ' || item == "\n") continue;
			if(!isNaN(item*1)) field.push(item*1);
			if(field.length === 81) break;
		}

		return field;
	}

	m.generate = function() {

		var maxAttempts = 1000;
		var start = Date.now();

		var i;
		for(i = 0; i < 1000; i++) {
			if(generateNewSudokuField()) {
				break;
			}
		}

		var time = Date.now() - start;
		console.log("New sudoku field generated successfully. [ attemps = '"+i+"', time = '"+time+" milis.']");

		return this;
	};

	m.generateAsGame = function(difficulty) {
		m.generate();

		if(difficulty == 'easy') { difficulty = [0, 4]; }
		if(difficulty == 'medium') { difficulty = [1, 6]; }
		if(difficulty == 'hard') { difficulty = [2, 8]; }

		each([0, 3, 6, 27, 30, 33, 54, 57, 60], function(i) {
			getCursor(i).makeBlanksOnArea(difficulty[0], difficulty[1]);
		});

		return this;
	};

	var generateNewSudokuField = function() {

		// reset vars
		field = [];
		unassignedIndexes = [];

		// make random field applying sudoku rules
		var assignRandomNumbers = function() {
			unassignedIndexes = [];
			for(var i = 0; i < 81; i++) {
				assignNumber(i);
				if(!field[i]) {
					field[i] = 0;
					unassignedIndexes.push(i);
				}
			}
			
		};

		// row, col, area
		var applyShift = function(type) {
			type = type + 'Shift';
			return function() {
				each(unassignedIndexes, function(index) {
					var c = getCursor(index);
					if(c[type]()) return;
				});
			}
		}

		var progress = 1000;

		for(var i = 0; i < 15; i++) {
			
			each(['row', 'col', 'area'], function(type) {
				assignRandomNumbers();
				applyShift(type)();
				assignRandomNumbers();
			});

			if(progress == unassignedIndexes.length) {
				break;
			} else {
				progress = unassignedIndexes.length;
			}
		}

		return (unassignedIndexes.length === 0);
	};

	m.isValid = function() {
		var hasBlanks = false;

		for(var i =0, j = field.length; i < j; i++) {
			if(typeof(field[i]) !== 'number' || field[i] < 0 || field[i] > 9) {
				alert('Invalid sudoku (illegal char): Bad item on position ' + i);
				return;
			}

			if(field[i] === 0) {
				hasBlanks = true;
				continue;
			}

			var c = getCursor(i);

			// 1 uniqueRow
			if(c.row().itemsCount(field[i]) != 1) {
				alert('Invalid sudoku (rowCheck): Bad item on position ' + i);
				return;
			}

			// 2 uniqueCol
			if(c.col().itemsCount(field[i]) != 1) {
				alert('Invalid sudoku (colCheck): Bad item on position ' + i);
				return;
			}
		
			// 3 uniqueArea
			if(c.area().itemsCount(field[i]) != 1) {
				alert('Invalid sudoku (areaCheck): Bad item on position ' + i);
				return;
			}
		

		}

		if(!hasBlanks) {
			alert('Sudoku field is valid.');
		} else {
			alert('Sudoku field appiers valid, but has blanks.');
		}
		
	}

	var BREAK = 'BREAK';	// use this constant to exit inner loops via try chatch mechanism

	m.solve = function() {

		var addDistinctNumbers = function() {
			var added = 0;
			do {
				added = 0;
				each(field, function(item, position) {
					if(item !== 0) return;

					var allowedNumbers = getAllowedNumbersFor(position);

					if(allowedNumbers.length === 0) {
						throw new Error("This field can not be solved.");
					}

					if(allowedNumbers.length === 1) {
						field[position] = allowedNumbers[0];
						added++;
					}

				});
			} while(added > 0);
		}

		addDistinctNumbers();
		if(!hasBlanks()) {
			return this;	// done
		}

		var findFirstValidSolution = function(fieldBeforeChanges) {
			var localfield = fieldBeforeChanges;
			

			each(getBlankPositions(), function(position) {

				each(getAllowedNumbersFor(position), function(allowedNumber) {
					localfield[position] = allowedNumber;
					
					try {
						addDistinctNumbers();
					} catch(error) {
						return true;	// continue with other position
					}

					if(hasBlanks()) {
						findFirstValidSolution(localfield);
					} else {
						field = localfield;
						throw BREAK;
					}
				});

			});
		};

		try {
			findFirstValidSolution(field);
		} catch(err) {
			if(err !== BREAK) throw err;
		}

		return this;
	};

	var getBlankPositions = function() {
		var blanks = [];
		for(var i=0,j=field.length;i<j;i++) {
			if(field[i] === 0) {
				blanks.push(i);
			}
		}
		return blanks;
	}

	var hasBlanks = function() {
		for(var i=0,j=field.length;i<j;i++) {
			if(field[i]===0) return true;
		}
		return false;
	};

	// return true if operation was successfull
	var assignNumber = function(position) {
		if(!Array.isArray(field)) field = [];
		if(position > 80 || position < 0) throw new Error("Sudoku field overflow or underflow. Invalid position " + position + ".");

		if(field[position] && field[position] > 0) return false;	// already assigned

		var allowedNumbers = getAllowedNumbersFor(position);
		if(allowedNumbers.length == 0) {
			return false;
		}

		field[position] = allowedNumbers[randInt(0, allowedNumbers.length-1)];
		return true;
	};

	var getAllowedNumbersFor = m.getAllowedNumbersFor = function(position, skipRowCheck, skipCallCheck, skipAreaCheck) {

		var allowedNumbers = [1,2,3,4,5,6,7,8,9];
		var cursor = getCursor(position);

		// 1 uniqueRow
		if(!skipRowCheck) {
			allowedNumbers = allowedNumbers.filter(function(v) {
				return cursor.row().indexOf(v) < 0;
			});
		}

		// 2 uniqueCol
		if(!skipCallCheck) {
			allowedNumbers = allowedNumbers.filter(function(v) {
				return cursor.col().indexOf(v) < 0;
			});
		}

		// 3 uniqueArea
		if(!skipAreaCheck) {
			allowedNumbers = allowedNumbers.filter(function(v) {
				return cursor.area().indexOf(v) < 0;
			});
		}

		return allowedNumbers;
	};

	var getCursor = m.getCursor = function(position) {
		return {
			position: position,
			
			field: field,
			
			row: function() {
				/*if(this._row) {
					return this._row;
				}*/

				this._row = [];
				var rowIndexes = indexes.row(position);
				for(var i = rowIndexes[0]; i <= rowIndexes[1]; i++) {
					this._row.push(this.field[i]);
				}

				return this._row;
			},

			col:  function() {
				/*if(this._col) {
					return this._col;
				}*/

				this._col = [];
				var colIndex = indexes.col(position);
				for(var i = colIndex; i <= 80; i=i+9) {
					this._col.push(this.field[i]);
				}

				return this._col;
			},

			area: function() {
				/*if(this._area) {
					return this._area;
				}*/

				this._area = [];
				var areaTopIndex = indexes.area(position);
				for(var j = 0; j < 3; j++) {
					for(var i = areaTopIndex[0]; i <= areaTopIndex[1]; i++) {
						this._area.push(this.field[i]);
					}
					areaTopIndex = [ areaTopIndex[0] + 9, areaTopIndex[1] + 9 ];
				}

				return this._area;
			},

			makeBlanksOnArea: function(min, max) {
				var area = this.area();
				var blanksCount = randInt(min, max);

				if(area.itemsCount(0)>=max) return;

				while(blanksCount > 0) {
					var pos = randInt(0, area.length-1);
					if(area[pos] != 0) {
						area[pos] = 0;
						blanksCount--;
					}
				}

				// do not rage, this was written at midnight
				var areaTopIndex = indexes.area(position);
				var x = 0;
				for(var j = 0; j < 3; j++) {
					for(var i = areaTopIndex[0]; i <= areaTopIndex[1]; i++) {
						this.field[i] = area[x];
						x++;
					}
					
					areaTopIndex = [ areaTopIndex[0] + 9, areaTopIndex[1] + 9 ];
				}
			},

			// return true if sucessfull
			rowShift: function() {
				var allowedNumbers = getAllowedNumbersFor(this.position, true, false, false); // skip row check

				if(!allowedNumbers.length) {
					return false;
				}

				// console.log(allowedNumbers);

				var numberToShift = allowedNumbers[randInt(0, allowedNumbers.length -1)];

				// console.log(numberToShift);

				var row = this.row();

				// console.log(row);

				var from = indexes.col(position);
				var to = row.indexOf(numberToShift);

				row[to] = 0;
				row[from] = numberToShift;

				// console.log(row);	// row is now updated

				// save it back to the field instance
				var rowIndexes = indexes.row(this.position);
				for(var i = rowIndexes[0], j=0; i <= rowIndexes[1]; i++, j++) {
					this.field[i] = row[j];
				}

				this.clearCache();
				return true;
			},

			// return true if sucessfull
			colShift: function() {
				var allowedNumbers = getAllowedNumbersFor(this.position, false, true, false); // skip col check

				if(!allowedNumbers.length) {
					return false;
				}

				// console.log(allowedNumbers);

				var numberToShift = allowedNumbers[randInt(0, allowedNumbers.length -1)];

				// console.log(numberToShift);

				var col = this.col();

				// console.log(col);

				var from = Math.floor(position/9);
				var to = col.indexOf(numberToShift);

				col[to] = 0;
				col[from] = numberToShift;

				// console.log(col);	// col is now updated

				// save it back to the field instance
				var colIndex = indexes.col(this.position);
				for(var i = colIndex, j = 0; i <= 80; i=i+9, j++) {
					this.field[i] = col[j];
				}


				this.clearCache();
				return true;
			},

			// return true if sucessfull
			areaShift: function() {
				var allowedNumbers = getAllowedNumbersFor(this.position, false, false, true); // skip area check

				if(!allowedNumbers.length) {
					return false;
				}

				// console.log(allowedNumbers);

				var numberToShift = allowedNumbers[randInt(0, allowedNumbers.length -1)];

				// console.log(numberToShift);

				var area = this.area();

				// console.log(col);

				var from = Math.floor(position/9);
				var to = area.indexOf(numberToShift);

				area[to] = 0;
				area[from] = numberToShift;

				// console.log(area);	// area is now updated

				// save it back to the field instance
				
				this._area = [];
				var k = 0
				var areaTopIndex = indexes.area(position);
				for(var j = 0; j < 3; j++) {
					for(var i = areaTopIndex[0]; i <= areaTopIndex[1]; i++) {
						this.field[i] = area[k];
						k++;
					}
					areaTopIndex = [ areaTopIndex[0] + 9, areaTopIndex[1] + 9 ]
				}

				this.clearCache();
				return true;
			},

			clearCache: function() {
				this._row = undefined;
				this._col = undefined;
				this._area = undefined;
			}
		};
	}

	var colIndex = function(position) {
		return indexes.col(position);
	};

	var rowIndex = function(position) {
		return Math.floor(position/9);
	}

	var indexes = {};

	// return [low, high]
	indexes.row = function(position) {
		var low = (Math.floor(position / 9) * 9);
		return [low, low+8];
	};

	// return colIndex
	indexes.col = function(position) {
		return position - (Math.floor(position / 9))*9;
	};

	// return [low, high] of first area row
	indexes.area = function(position) {
		var colIndex = indexes.col(position);

		var areaR = Math.floor((Math.floor(position / 9))/3);
		var areaC = Math.floor(colIndex / 3);

		// console.log(areaR + " x " + areaC);

		var corner = 9*3*areaR + 3*areaC;

		return [corner, corner + 2];
	};


	return m;

}(sudoku || {}));

