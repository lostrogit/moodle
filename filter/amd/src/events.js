// This file is part of Moodle - http://moodle.org/ //
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
 * Javascript events for the `core_filters` subsystem.
 *
 * @module     core_filters/events
 * @copyright  2021 Andrew Nicols <andrew@nicols.co.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      4.0
 *
 * @example <caption>Example of listening to a filter event.</caption>
 * import {eventTypes as filterEventTypes} from 'core_filters/events';
 *
 * document.addEventListener(filterEventTypes.filterContentUpdated, e => {
 *     window.console.log(e.detail.nodes); // A list of the HTMLElements whose content was updated
 * });
 */

import {dispatchEvent} from 'core/event_dispatcher';
import {getList as normalistNodeList} from 'core/normalise';
import jQuery from 'jquery';

/**
 * Events for the `core_filters` subsystem.
 *
 * @constant
 * @property {String} filterContentUpdated See {@link event:filterContentUpdated}
 */
export const eventTypes = {
    /**
     * An event triggered when page content is updated and must be processed by the filter system.
     *
     * An example of this is loading user text that could have equations in it. MathJax can typeset the equations but
     * only if it is notified that there are new nodes in the page that need processing.
     *
     * @event filterContentUpdated
     * @type {CustomEvent}
     * @property {object} detail
     * @property {NodeElement[]} detail.nodes The list of parent nodes which were updated
     */
    filterContentUpdated: 'core_filters/contentUpdated',
};

/**
 * Trigger an event to indicate that the specified nodes were updated and should be processed by the filter system.
 *
 * @method notifyFilterContentUpdated
 * @param {jQuery|Array} nodes
 * @returns {CustomEvent}
 * @fires filterContentUpdated
 */
export const notifyFilterContentUpdated = nodes => {
    // Historically this could be a jQuery Object.
    // Normalise the list of nodes to a NodeList.
    nodes = normalistNodeList(nodes);

    return dispatchEvent(eventTypes.filterContentUpdated, {nodes});
};

let legacyEventsRegistered = false;
if (!legacyEventsRegistered) {
    // The following event triggers are legacy and will be removed in the future.
    // The following approach provides a backwards-compatability layer for the new events.
    // Code should be updated to make use of native events.

    Y.use('event', 'moodle-core-event', () => {
        // Provide a backwards-compatability layer for YUI Events.
        document.addEventListener(eventTypes.filterContentUpdated, e => {
            // Trigger the legacy jQuery event.
            jQuery(document).trigger(M.core.event.FILTER_CONTENT_UPDATED, [jQuery(e.detail.nodes)]);

            // Trigger the legacy YUI event.
            Y.fire(M.core.event.FILTER_CONTENT_UPDATED, {nodes: new Y.NodeList(e.detail.nodes)});
        });
    });

    legacyEventsRegistered = true;
}

// Identify web browser and Os in order to fix the 'scrollbar-width: thin' property to auto since this
// property does not apply consistent in firefox browser for each Os (win/linux).
const fixScroll = () => {
    const platform = navigator?.userAgentData?.platform || navigator?.platform || 'undefined';
    const userAgent = navigator?.userAgent || 'unknown';
    const isLinux = platform.indexOf('Linux') !== -1;

    if (isLinux && userAgent.match(/firefox|fxios/i)) {
        // Set initial selectors to be found.
        const selectors = ['[style*="scrollbar-width:thin"],[style*="scrollbar-width: thin"]'];
        // Css RegExt used to found within the whole css rules.
        const cssToSearch = /\bscrollbar-width:\s*thin;/;
        // Get all style sheets added to the document.
        const styles = Array.from(document.styleSheets);

        // We need to go throughout all the styles rules created into previous located style sheets,
        // then retrieve all existing 'scrollbar-width' properties with their own selector.
        const filteredRules = styles.flatMap(styleSheet =>
            Array.from(styleSheet.cssRules).filter(rule => cssToSearch.test(rule.cssText))
        ).map(rule => {
            if (!rule.cssRules || typeof rule.selectorText !== 'undefined') {
                return rule.selectorText;
            }
            const nestedRule = Array.from(rule.cssRules).find(myRule => cssToSearch.test(myRule.cssText));
            return nestedRule ? nestedRule.selectorText : '';
        });
        selectors.push(...filteredRules);

        // Even though the scrollbarWidth = 'thin' property is applicable in firefox browser in general,
        // we change it to 'auto' when is used by linux-firefox client in order to keep consistent the gap in the scrollbar.
        document.querySelectorAll(selectors.join(',')).forEach(element => {
            element.style.setProperty('scrollbar-width', 'auto');
        });
    }
};

// Call the fixScroll method when file is loaded and when the filterContentUpdated
// event is triggered in order to fix the scroll bar.
fixScroll();
document.addEventListener(eventTypes.filterContentUpdated, () => {
    fixScroll();
});