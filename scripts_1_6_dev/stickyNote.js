import * as d3 from 'd3';
import { count_clusters } from './colorBar';
import { update_selected_count } from './selection_script';
import { all_outlines } from './forceLayout_script';

export const stickyNote_setup = () => {
  let popup = d3
    .select('#force_layout')
    .append('div')
    .attr('id', 'stickyNote_popup')
    .on('mousedown', deactivate_all);

  let button_bar = popup
    .append('div')
    .attr('id', 'stickyNote_button_bar')
    .style('width', '100%');

  let selected_note = null;

  button_bar
    .append('button')
    .text('Close')
    .style('margin-right', '11px')
    .on('click', function() {
      if (!is_synched()) {
        hide_stickyNote_popup();
      } else {
        hide_stickyNote_popup();
      }
    });

  button_bar
    .append('button')
    .text('Save')
    .on('click', save_note)
    .attr('id', 'sticky_save_button');

  button_bar
    .append('button')
    .text('New')
    .on('click', new_note);

  button_bar
    .append('button')
    .text('Delete')
    .on('click', delete_note);

  button_bar
    .append('button')
    .text('Bind cells')
    .on('click', bind_cells);

  button_bar
    .append('button')
    .text('Show selected')
    .on('click', show_selected);

  let sticky_div = popup.append('div').attr('id', 'sticky_div');

  button_bar.selectAll('button').on('mousedown', function() {
    d3.event.stopPropagation();
  });

  popup
    .append('div')
    .attr('id', 'sticky_email')
    .append('label')
    .text('Email address')
    .append('input')
    .attr('type', 'text')
    .on('mousedown', function() {
      d3.event.stopPropagation();
    })
    .attr('id', 'sticky_email_input')
    .style('width', '252px');

  let sticky_path = window.location.search;
  sticky_path = sticky_path.slice(1, sticky_path.length) + '/sticky_notes_data.json';
  $.get(sticky_path)
    .done(function() {
      d3.json(sticky_path).then(data => {
        data.forEach(function(d) {
          new_note(d);
        });
      });
    })
    .fail(function() {
      const note = new_note();
      activate_note(note);
    });

  function delete_note() {
    d3.selectAll('.sticky_note').each(function(d, i) {
      if (d3.select(this).attr('active') === 'true') {
        d3.select(this).remove();
      }
    });
  }

  function new_note(d) {
    if (!d) {
      d = { text: '', emails: '', bound_cells: get_selected_cells().join(',') };
    }

    let note = sticky_div.insert('div', ':first-child').attr('class', 'sticky_note');
    note.append('textarea').style('height', '90px');
    note.on('mousedown', function() {
      d3.event.stopPropagation();
      if (note.attr('active') !== 'true') {
        deactivate_all();
        activate_note(note);
      }
    });
    note.attr('bound_cells', d.bound_cells);
    note.attr('saved_text', d.text);
    note.attr('emails', d.emails);
    note.select('textarea').text(d.text);
    note.select('p').text(d.text);

    return note;
  }

  function activate_note(note) {
    if (note.attr('active') !== 'true') {
      note.select('p').style('visibility', 'hidden');
      $(note.select('textarea')[0][0]).focus();

      // 			let emails = note.attr('emails');
      // 			if (emails.length > 0) {
      // 				$('#sticky_email_input').value = emails.split(',')[1];
      // 			}
    }

    note.style('border', 'solid 2px rgba(230,230,230,.8)').attr('active', 'true');

    let my_nodes = [];
    note
      .attr('bound_cells')
      .split(',')
      .forEach(function(d) {
        if (d !== '') {
          my_nodes.push(parseInt(d, 10));
          all_outlines[d].selected = true;
          all_outlines[d].tint = '0xffff00';
          all_outlines[d].alpha = 1;
        }
      });
    count_clusters();
    update_selected_count();
    shrinkNodes(10, 10, my_nodes);
  }

  function deactivate_all() {
    d3.selectAll('.sticky_note')
      .attr('active', 'false')
      .style('border', '0px');

    d3.selectAll('.sticky_note')
      .selectAll('textarea')
      .style('background-color', 'transparent')
      .style('border', 'none');
  }

  function sync_note(note) {
    if (note.attr('saved_text') !== $(note.select('textarea')[0][0]).val()) {
      note.attr('saved_text', $(note.select('textarea')[0][0]).val());
      let my_emails = note.attr('emails').split(',');
      let current_email = $('#sticky_email_input').val();
      if (my_emails.indexOf(current_email) === -1) {
        my_emails.push(current_email);
        note.attr('emails', my_emails.join(','));
      }
    }
  }

  function bind_cells(note) {
    let sel = get_selected_cells().join(',');
    d3.selectAll('.sticky_note').each(function() {
      if (d3.select(this).attr('active') === 'true') {
        d3.select(this).attr('bound_cells', sel);
      }
    });
  }

  function get_selected_cells() {
    let sel = [];
    for (let i = 0; i < all_outlines.length; i++) {
      if (all_outlines[i].selected) {
        sel.push(i);
      }
    }
    return sel;
  }

  function save_note() {
    if (!check_email()) {
      flash_email();
      return false;
    } else {
      d3.selectAll('.sticky_note').each(function() {
        sync_note(d3.select(this));
      });
      write_data();
      return true;
    }
  }

  function write_data() {
    let all_data = [];
    d3.selectAll('.sticky_note').each(function(d) {
      let note = d3.select(this);
      let text = note.attr('saved_text');
      let emails = note.attr('emails');
      let bound_cells = note.attr('bound_cells');
      if (text !== '') {
        let my_data = { text: text, emails: emails, bound_cells: bound_cells };
        all_data.push(my_data);
      }
    });
    let path = window.location.search;
    path = path.slice(1, path.length) + '/sticky_notes_data.json';
    $.ajax({
      data: { path: path, content: JSON.stringify(all_data, null, ' ') },
      success: function() {
        sweetAlert({ title: 'All stickies have been saved' });
      },
      type: 'POST',
      url: 'cgi-bin/save_sticky.py',
    });
  }

  function check_email() {
    if (
      $('#sticky_email_input')
        .val()
        .indexOf('@') > -1
    ) {
      return true;
    } else {
      return false;
    }
  }

  function flash_email() {
    $('#sticky_email_input').addClass('flash');
    setTimeout(function() {
      $('#sticky_email_input').removeClass('flash');
    }, 500);
  }

  function is_synched() {
    return true;
  }

  function stickyNote_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }
  function stickyNote_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#stickyNote_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#stickyNote_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#stickyNote_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#stickyNote_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }
  function stickyNote_popup_dragended() {
    return;
  }

  function show_selected() {
    let selected_cells = [];
    for (let i = 0; i < all_outlines.length; i++) {
      if (all_outlines[i].selected) {
        selected_cells.push(i.toString());
      }
    }
    d3.selectAll('.sticky_note').style('background-color', 'rgba(0,0,0,.5)');
    d3.selectAll('.sticky_note').each(function() {
      let note = d3.select(this);
      const bound_cells = note.attr('bound_cells').split(',');
      if (bound_cells.filter(n => selected_cells.includes(n)).length > 0) {
        note.style('background-color', 'rgba(255,255,0,.4)');
        $(sticky_div[0][0]).prepend(note[0][0]);
      }
    });
  }

  d3.select('#stickyNote_popup').call(
    d3.drag()
      .on('start', stickyNote_popup_dragstarted)
      .on('drag', stickyNote_popup_dragged)
      .on('end', stickyNote_popup_dragended),
  );
}

function hide_stickyNote_popup() {
  d3.select('#stickyNote_popup').style('visibility', 'hidden');
}

function show_stickyNote_popup() {
  let mywidth = parseInt(
    d3
      .select('#stickyNote_popup')
      .style('width')
      .split('px')[0],
    10,
  );
  let svg_width = parseInt(
    d3
      .select('svg')
      .style('width')
      .split('px')[0],
    10,
  );
  d3.select('#stickyNote_popup')
    .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
    .style('top', '10px')
    .style('visibility', 'visible');
}
