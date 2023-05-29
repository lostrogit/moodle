// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Autocomplete library config
 *
 * @module      core/autocomplete_loader
 * @copyright   2023 Moodle Pty Ltd <support@moodle.com>
 * @author      2023 Carlos Castillo <carlos.castillo@moodle.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

"use strict";

import AutoComplete from 'core/autocomplete';
import {get_string as getString} from "./str";
import Notification from 'core/notification';
import Pending from 'core/pending';

/**
 * Retrieve all search result.
 *
 * @method
 * @param {string} query Selector id for search input
 * @param {string} method used to retrieve the search result
 * @returns {Promise}
 */
const fetchSearch = async(query, method = 'core_search_autocomplete') => {
    const Ajax = await import('core/ajax');

    const request = await Ajax.call([{
        methodname: method,
        args: {
            query: query
        }
    }])[0];
    return request.results;
};

/**
 * Initialise module, ensuring we load our resources and event listeners only once
 *
 * @param {string} selector Selector id for search input
 * @param {string} placeholder The placeholder to show into search input
 * @param {object} paginationConfig pagination config setting
 */
export const init = (selector, placeholder, paginationConfig) => {
    let currentResults;
    let limits = {
        'min': 1,
        'max': paginationConfig
    };

    const autoCompleteJS = new AutoComplete({
        selector: "#" + selector,
        searchEngine: "strict",
        data: {
            src: fetchSearch,
            keys: ["title", "settingname", "settingvisiblename", "settingdescription"],
            cache: false,
            filter: (list) => {
                // Filter duplicates
                // in case of multiple data keys usage
                return Array.from(
                    new Set(list.map((value) => value.match))
                ).map((settingname) => {
                    return list.find((value) => value.match === settingname);
                });
            }
        },
        placeHolder: placeholder,
        resultsList: {
            id: 'autoComplete_list',
            position: 'afterbegin',
            element: async(list, data) => {
                if (data.results.length) {
                    list.style["overflow-y"] = "scroll";
                    currentResults = data;
                    limits.min = 1;
                    limits.max = data.results.length;
                    await addPagination(list);
                } else {
                    const info = document.createElement("div");
                    info.setAttribute("class", "no_result");
                    list.style["overflow-y"] = "hidden";
                    info.innerHTML = await getString('noresultsfound', 'search', `"${data.query}"`);
                    list.append(info);
                }
            },
            destination: '#autoCompleteResult',
            noResults: true,
            maxResults: paginationConfig,
            tabSelect: true,
        },
        resultItem: {
            element: (item, data) => {
                item.style = "display: flex; justify-content: space-between; cursor: pointer;";
                item.setAttribute("onclick", "location.href='" + data.value.url + "'");
                let icon = data.key === 'settingname' ? 'fa-gear' : 'fa-bars';
                item.innerHTML = `
                  <span style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                    <i class="fa ${icon}"></i> ${data.match}
                    <i class="fa fa-arrow-up-right-from-square"></i>
                  </span>`;
            },
            highlight: true,
        },
        events: {
            input: {
                focus: () => {
                    if (autoCompleteJS.input.value.length > 2) {
                        autoCompleteJS.start();
                    }
                }
            }
        }
    });

    /**
     * @param {Object} container
     */
    const redrawAutocompleteResults = (container) => {
        const pendingPromise = new Pending('core/datafilter:addFilterRow');
        container.innerHTML = '';
        currentResults.matches.entries().forEach(([index, data]) => {
            if (index >= (limits.min - 1) && index <= (limits.max - 1)) {
                const resultitem = document.createElement("li");
                resultitem.style = "display: flex; justify-content: space-between; cursor: pointer;";
                resultitem.setAttribute("id", "autoComplete_result_" + (index - 1));
                resultitem.setAttribute("role", "option");
                resultitem.setAttribute("onclick", "location.href='" + data.value.url + "'");
                let icon = data.key === 'settingname' ? 'fa-gear' : 'fa-bars';
                resultitem.innerHTML = `
                  <span style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                    <i class="fa ${icon}"></i> ${data.match}
                    <i class="fa fa-arrow-up-right-from-square"></i>
                  </span>`;
                container.append(resultitem);
            }
        });
        addPagination(container).then(result => {
            pendingPromise.resolve();
            return result;
        })
        .catch(Notification.exception);
    };

    /**
     * @param {Object}  ev
     * @param {Object} container
     */
    const autocompletePrev = (ev, container) => {
        if (limits.min > 1) {
            limits.max = (limits.max === currentResults.matches.length) ? limits.max - ((limits.max - limits.min) + 1) :
                limits.max - autoCompleteJS.resultsList.maxResults;
            limits.min = limits.min - autoCompleteJS.resultsList.maxResults;
            redrawAutocompleteResults(container);
        }
        ev.stopPropagation();
    };

    /**
     * @param {Object} ev
     * @param {Object} container
     */
    const autocompleteNext = (ev, container) => {
        if (limits.max < currentResults.matches.length) {
            const exceedMax = (limits.max + autoCompleteJS.resultsList.maxResults > currentResults.matches.length);
            limits.min = limits.min + autoCompleteJS.resultsList.maxResults;
            limits.max = exceedMax ? currentResults.matches.length
                : limits.max + autoCompleteJS.resultsList.maxResults;
            redrawAutocompleteResults(container);
        }
        ev.stopPropagation();
    };

    /**
     * @param {Object} element
     */
    const addPagination = async(element) => {
        const createAndAppendElement = (tag, attributes = {}, innerHTML = "") => {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            element.innerHTML = innerHTML;
            return element;
        };

        const pag = createAndAppendElement("div", {"class": "d-flex justify-content-between"});
        pag.onclick = (ev) => {
            ev.stopPropagation();
        };

        const prev = createAndAppendElement("span", {
            "class": "icon fa fa-left-long p-1 ml-2",
            style: "cursor:pointer"
        });
        prev.onclick = (ev) => {
            autocompletePrev(ev, element);
        };
        if (limits.min <= 1) {
            prev.style.visibility = "hidden";
        }
        pag.append(prev);

        let searchResultParams = {
            'link': currentResults.results[0].value.rooturl,
        };
        let searchResult = await getString('autocompletesearchresult', 'search', searchResultParams);

        const stats = createAndAppendElement("p", {
            "class": "text-muted small p-1 m-0",
            "id": "autoComplete_stats"
        }, `${limits.min}-${limits.max} / ${currentResults.matches.length} - ${searchResult}`);

        pag.append(stats);

        const next = createAndAppendElement("span", {
            "class": "icon fa fa-right-long p-1 mr-2",
            "style": "cursor:pointer"
        });
        next.onclick = (ev) => {
            ev.preventDefault();
            autocompleteNext(ev, element);
        };
        if (limits.max === currentResults.matches.length) {
            next.style.visibility = "hidden";
        }
        pag.append(next);

        element.append(pag);
    };
};
