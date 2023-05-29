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

import {autocomplete} from 'core/autocomplete';
import {getString} from "./str";

/**
 * Retrieve all search results.
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
 * @param {integer} paginationConfig pagination config setting
 * @param {bool} showinmodal pagination config setting
 */
export const init = async(selector, placeholder, paginationConfig, showinmodal) => {

    // Define strings
    const allResultString = await getString('autocompletesearchresult', 'search');
    const clickHereString = await getString('clickhere', 'moodle');
    const noResultsString = await getString('noresultsfound', 'search');

    // Define pagination variables
    let currentPage = 0;
    const itemsPerPage = paginationConfig; // Adjust as needed
    let allResults = []; // Store all results

    autocomplete({
        container: '#' + selector,
        placeholder: placeholder,
        detachedMediaQuery: showinmodal ? '' : 'null',
        getSources({query}) {
            if (query.length <= 3) {
                return [];
            }
            return fetchSearch(query).then((response) => {
                allResults = response;

                const source = {
                    sourceId: 'settings',
                    getItems() {
                        const startIndex = currentPage * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        return allResults.slice(startIndex, endIndex);
                    },
                    getItemInputValue({item}) {
                        return item.description;
                    },
                    getItemUrl({item}) {
                        return item.url;
                    },
                    onSelect: function({item}) {
                        window.location.href = item.url;
                    },
                    templates: {
                        item({item, html}) {
                            return html`
                                <div class="aa-ItemWrapper">
                                    <div class="aa-ItemContent">
                                        <div class="aa-ItemIcon aa-ItemIcon--noBorder">
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <path
                                                        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                                                />
                                                <polyline points="15 3 21 3 21 9"/>
                                                <line x1="10" y1="14" x2="21" y2="3"/>
                                            </svg>
                                        </div>
                                        <div class="aa-ItemContentBody">
                                            <div class="aa-ItemContentTitle">
                                                ${item.settingvisiblename}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="aa-ItemWrapper">
                                    <div class="aa-ItemContent aa-ItemContent--indented">
                                        <div class="aa-ItemContentSubtitle aa-ItemContentSubtitle--standalone">
                                            <span class="aa-ItemContentSubtitleIcon"></span>
                                            <span>in <span class="aa-ItemContentSubtitleCategory">
                                                    ${item.path}
                                                </span>
                                                </span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        },
                        footer({items, html}) {
                            const totalItems = allResults.length;
                            const totalPages = Math.ceil(totalItems / itemsPerPage);

                            const numberOfPages = Array.from({length: totalPages}, (_, i) => i + 1);
                            return html`
                                <div class="footer-container">
                                    <nav aria-label="Autocomplete pagination">
                                        <ul class="pagination justify-content-center">
                                            ${numberOfPages.map(
                                                (page) =>
                                                    html`
                                                        <li class="page-item ${currentPage + 1 === page ? `active` : ``}">
                                                            <a class="page-link pagination-button"
                                                               data-page="${page}" href="#">${page}</a>
                                                        </li>`
                                            )}
                                        </ul>
                                    </nav>
                                    <div class="text-center">
                                        ${allResultString}<a href="${items[0].rooturl}">  ${clickHereString}</a>
                                    </div>
                                </div>`;
                        },
                    },
                };
                return [source];
            });
        },
        renderNoResults({state, render}, root) {
            render(`"${noResultsString} ${state.query}".`, root);
        },
    });

    // Event listener for the "page" button
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('pagination-button')) {
            currentPage = parseInt(event.target.getAttribute('data-page'), 10) - 1;
            document.querySelector('.aa-Input').dispatchEvent(new Event('input'));
        }
    });
};
