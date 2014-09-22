(function($) {
    'use strict';

    var methods = {
        init: function(settings) {
            var $currentOpt,
                $this = this,
                settingsDefaults = {
                    data: [],
                    dataMethod: undefined,
                    minLength: 1,
                    maxCount: Infinity,
                    extraClass: '',
                    appendTo: undefined,
                    position: true,
                    sort: function(data) {
                        return (this.dataMethod instanceof Function)? data:data.sort();
                    },
                    matcher: function(query, option) {
                        return option.toString().toLowerCase().indexOf(query.toLowerCase()) !== -1;
                    },
                    lookUp: function(data, option) {
                        var options = [];
                        $.each(data, function(idx, val) {
                            options.push(val.toString());
                        });
                        return options.indexOf(option.toString());
                    },
                    renderOption: function(option) {
                        return option.toString();
                    },
                    onOptionSelect: function(query, option) {
                        return option.toString();
                    },
                    onBlur: function(closeCallback) {
                        closeCallback();
                    }
                },
                storedData = $this[0]._ac;

            settings = $.extend(settingsDefaults, settings);
            settings.position = (settings.appendTo)? false:settings.position;

            function createOptionsDiv() {
                var position, $appendDiv, $optionsContainerDiv;
                $optionsContainerDiv = $('<div>').css('display', 'none');
                if(settings.position) {
                    position = {
                        left: $this.offset().left,
                        top: $this.offset().top + $this.height()
                    };
                    $optionsContainerDiv.css('position', 'relative').css('top', position.top).css('left', position.left).css('zIndex', 1000);
                }
                $optionsContainerDiv.addClass('ac-options').addClass(settings.extraClass);
                $this.attr('data-ac', 'true');
                $optionsContainerDiv.on('mousedown.ac', 'div', chooseOption);
                $appendDiv = (settings.appendTo)? $(settings.appendTo):$('body');
                $appendDiv.append($optionsContainerDiv);
                settings.data = settings.sort(settings.data);
                // Save
                $this[0]._ac = {
                    settings: settings,
                    $optionsContainerDiv: $optionsContainerDiv
                };
            }
            function onBlur() {
                var settings = $this[0]._ac.settings;
                settings.onBlur(close);
            }
            function chooseOption(event, optIndex) {
                var value, option,
                    query = $this.val(),
                    settings = $this[0]._ac.settings;
                optIndex = optIndex || $(event.target).closest('.ac-opt').attr('data-opt-idx');
                option = settings.data[optIndex];
                value = settings.onOptionSelect(query, option);
                if(value !== undefined) {
                    $this.val(value);
                }
                // computeOptions();
                setTimeout(function() {
                    $this.focus();
                });
            }
            function changeCurrentOpt($other) {
                if($currentOpt) {
                    $currentOpt.removeClass('ac-opt-curr');
                }
                $currentOpt = $other;
                $currentOpt.addClass('ac-opt-curr');
            }
            function keyHandler(event) {
                var prev, next,
                    $optionsContainerDiv = $this[0]._ac.$optionsContainerDiv;
                switch (event.keyCode) {
                    case 38:
                        if(!$currentOpt) {
                            changeCurrentOpt($optionsContainerDiv.children().eq(0));
                            prev = $currentOpt;
                        } else {
                            prev = $currentOpt.prev();
                        }
                        if(prev && prev.hasClass('ac-opt')) {
                            changeCurrentOpt(prev);
                        }
                        break;
                    case 40:
                        if(!$currentOpt) {
                            changeCurrentOpt($optionsContainerDiv.children().eq(0));
                            next = $currentOpt;
                        } else {
                            next = $currentOpt.next();
                        }
                        if(next && next.hasClass('ac-opt')) {
                            changeCurrentOpt(next);
                        }
                        break;
                    case 13:
                        if($currentOpt && $optionsContainerDiv.css('display') !== 'none') {
                            chooseOption(event, $currentOpt.attr('data-opt-idx'));
                        }
                        break;
                    default:
                        computeOptions($this);
                        break;
                }
            }

            if(!storedData) {
                createOptionsDiv();
                computeOptions($this);
                return $this.each(function() {
                    $this.bind('keyup.ac', keyHandler).bind('blur.ac', onBlur);
                });
            }
        },
        destroy: function() {
            return this.each(function() {
                var $this = $(this);
                $this.unbind('.ac');
                $this[0]._ac.$optionsContainerDiv.remove();
                delete $this[0]._ac;
            });
        },
        add: function(options) {
            var $this = this,
                settings = $this[0]._ac.settings;
            function unique(arr) {
                var uniqArr = [];
                $.each(arr, function(idx, el) {
                    if($.inArray(el, uniqArr) === -1) {
                        uniqArr.push(el);
                    }
                });
                return uniqArr;
            }
            options = (options instanceof Array)? options:[options];
            options = unique(options.concat(settings.data));
            settings.data = settings.sort(options);

            computeOptions($this);
        },
        remove: function(options) {
            var index,
                $this = this,
                settings = $this[0]._ac.settings;
            options = (options instanceof Array)? options:[options];
            $.each(options, function(idx, option) {
                index = settings.lookUp(settings.data, option);
                if(index !== -1) {
                    settings.data.splice(index, 1);
                }
            });

            computeOptions($this);
        }
    };

    $.fn.autocomplete = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('not-supported');
        }
    };

    function computeOptions($this) {
        var option,
            callback,
            $optionDiv,
            $divs = $(),
            query = $this.val(),
            $optionsContainerDiv = $this[0]._ac.$optionsContainerDiv,
            settings = $this[0]._ac.settings;
        $optionsContainerDiv.empty();
        if(query.length<settings.minLength) {
            close();
            return;
        }
        callback = function(data) {
            settings.data = settings.sort(data);
            for(var i=0; i<data.length && $divs.length<=settings.maxCount; i++) {
                option = data[i];
                if (settings.dataMethod instanceof Function || settings.matcher(query, option)) {
                    $optionDiv = $('<div></div>').addClass('ac-opt');
                    $optionDiv.attr('data-opt-idx', i);
                    $optionDiv.append(settings.renderOption(option));
                    $divs = $divs.add($optionDiv);
                }
            }
            if ($divs.length>0) {
                $optionsContainerDiv.append($divs);
                open();
            } else {
                close();
            }
        };
        if(settings.dataMethod instanceof Function) {
            settings.dataMethod(query, callback);
        } else {
            callback(settings.data);
        }
        function open() {
            var $optionsContainerDiv = $this[0]._ac.$optionsContainerDiv;
            $optionsContainerDiv.show();
            $this.trigger('opened');
        }
        function close() {
            var $optionsContainerDiv = $this[0]._ac.$optionsContainerDiv;
            $optionsContainerDiv.hide();
            $this.trigger('closed');
        }
    }

})(Zepto);
