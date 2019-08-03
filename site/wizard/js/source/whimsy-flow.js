// borrowed from https://whimsy.apache.org/board/agenda/app.js

class Flow {
  // reflow comment
  static comment(comment, initials, indent="    ") {
    let lines = comment.split("\n");
    let len = 71 - indent.length;

    for (let i = 0; i < lines.length; i++) {
      lines[i] = ((i == 0 ? initials + ": " : `${indent} `)) + lines[i].replace(
        new RegExp(`(.{1,${len}})( +|$\\n?)|(.{1,${len}})`, "g"),
        `$1$3\n${indent}`
      ).trim()
    };

    return lines.join("\n")
  };

  // reflow text.  Indent is a string containing the amount of spaces that are
  // to be added to each line.  The Incubator has special punctuation rules that
  // prohibit the joining of lines where the first line ends in either a colon
  // or a question mark.
  static text(text, indent="", puncrules=false) {
    // remove trailing spaces on lines
    text = text.replace(/[ \r\t]+\n/g, "\n");

    // split into lines
    let lines = text.split("\n");

    // join consecutive lines, making exception for lines that start with a 
    // hash (#) and <markers> like <private>, ")".
    for (let i = lines.length - 1; i >= 1; i--) {
      if (/^$|^#|\w>$/m.test(lines[i - 1])) continue;
      if (puncrules && /[:?]$/m.test(lines[i - 1])) continue;

      if (/^\s*\w/m.test(lines[i]) && !/^\s*\d+\./m.test(lines[i])) {
        lines.splice(i - 1, 2, lines[i - 1] + lines[i].replace(/^\s*/m, " "))
      }
    };

    // reflow each line
    let len = 78 - indent.length;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.length <= len) continue;
      let prefix = /^\d+\.\s+|^\W*/m.exec(line)[0];

      if (prefix.length == 0) {
        // not indented -> split
        lines[i] = line.replace(
          new RegExp(`(.{1,${len}})( +|$\\n?)`, "g"),
          "$1\n"
        ).replace(/[\n\r]+$/m, "")
      } else {
        // ensure line can be split after column 40
        let lastspace = /^.*\s\S/m.exec(line);

        if (lastspace && lastspace[0].length - 1 > 40) {
          // preserve indentation.
          let n = len - prefix.length;
          indent = prefix.replace(/\S/g, " ");

          lines[i] = prefix + line.slice(prefix.length).replace(
            new RegExp(`(.{1,${n}})( +|$\\n?)`, "g"),
            indent + "$1\n"
          ).replace(indent, "").replace(/[\n\r]+$/m, "")
        }
      }
    };

    return lines.join("\n")
  }
};