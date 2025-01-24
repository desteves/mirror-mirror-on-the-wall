import { basicSetup, EditorView } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";

// Define collections
const collections = ["crime", "person", "gymCheckin", "socialEventCheckin"];


// Define function signatures
const functions = [
  { label: 'find', apply: 'find(', type: "function", info: "Find documents", signature: "(query: object, projection: object)" },
  { label: 'count', apply: 'count()', type: "function", info: "Count documents", signature: "()" },
  { label: 'sort', apply: 'sort(', type: "function", info: "Sort documents", signature: "({field: string, direction: 1 | -1})" },
  { label: 'limit', apply: 'limit(', type: "function", info: "Limit documents", signature: "(limit: number)" },
  { label: 'distinct', apply: 'distinct(', type: "function", info: "Get distinct values", signature: "(field: string)" },
];

// Field names for each collection
const fields = {
  crime: ["description", "date", "type", "city"],
  person: ["name", "ssn", "addressStreetName", "addressNumber", "driversLicense.age", "driversLicense.eyeColor", "driversLicense.hairColor", "driversLicense.height", "driversLicense.id", "driversLicense.gender", "gym.joinedDate", "gym.level", "gym.memberId", "interview", "vehicle.make", "vehicle.model", "vehicle.plate"],
  gymCheckin: ["memberId", "checkInTime", "checkOutTime", "checkInDate", "name"],
  socialEventCheckin: ["eventId", "personId", "eventName", "date", "name"],
};


const expressions = [
  {
    label: "$gt",
    apply: "$gt : 123 ",
    type: "operator",
    info: "Greater than operator",
  },
  {
    label: "$gte",
    apply: "$gte : 123 ",
    type: "operator",
    info: "Greater than or equal to operator",
  },
  {
    label: "$lt",
    apply: "$lt : 123 ",
    type: "operator",
    info: "Less than operator",
  },
  {
    label: "$lte",
    apply: "$lte : 123 ",
    type: "operator",
    info: "Less than or equal to operator",
  },
  {
    label: "$in",
    apply: "$in: [1, 2] ",
    type: "operator",
    info: "Checks if a value is in a specified array",
  },
  {
    label: "$regex",
    apply: "$regex : /pattern/ ",
    type: "operator",
    info: "Matches a string pattern using regular expressions",
  }
];
// Function to get autocompletions
function mongoCompletions(context) {
  const textBefore = context.state.sliceDoc(0, context.pos); // Get all text before cursor
  // console.log("Text before cursor:", textBefore);

  const beforeCursor = context.matchBefore(/^d$|^db\.\w{4,19}\.$|\.\w{3,9}\($|\)\.$|,\s*\{\s*"$|,\s*"$|\$$/);
  if (!beforeCursor) return null;
  console.log("Before cursor:", beforeCursor);

  if (beforeCursor.from === beforeCursor.to && !context.explicit) return null;
  const wordBefore = beforeCursor.text;
  if (wordBefore === "d") {
    console.log("Suggesting collections...");
    return {
      from: beforeCursor.from,
      options: collections.map(col => ({ label: `db.${col}.`, type: "variable", info: `Use the ${col} collection` })),
      validFor: /^\w*$/
    };
  }

  const showFunctions = wordBefore.match(/\)\.$/) || collections.find(col => wordBefore.endsWith(`db.${col}.`));
  if (showFunctions) {
    console.log("Suggesting functions...");
    return {
      from: beforeCursor.to,
      options: [...functions],
      validFor: /^\w*$/
    };
  }

  // Extract collection name
  const collectionMatch = textBefore.match(/db\.(\w{4,19})\./);
  if (!collectionMatch) return null;
  const collectionName = collectionMatch[1];
  if (!collectionName || !fields[collectionName]) return null;
  console.log("Collection name:", collectionName);

  // Suggest args for functions that require them
  const showArgs = functions.find(f => wordBefore.endsWith(`.${f.apply}`));
  if (showArgs) {
    if (showArgs.label === "find") {
      console.log("Suggesting find args...");
      const filterFields = fields[collectionName].map(f => ({
        label: `"${f}"`,
        apply: `{ "${f}" : TODO })`,
        info: `Filter by the ${f} field`,
        type: "text"
      }));
      // console.log("Filter fields:", filterFields);
      return {
        from: beforeCursor.to,
        options: [
          {
            label: "/* Get everything */",
            apply: ")",
            info: "Get all documents"
          },
          {
            label: "/* Only projection */",
            apply: "{}, {",
            info: "Get all documents with projection"
          },
          ...filterFields
        ],
        validFor: /^\w*$/
      };
    } else if (showArgs.label === "distinct") {
      return {
        from: beforeCursor.to,
        options: fields[collectionName].map(f => ({
          label: `${f}`,
          apply: `"${f}")`,
          type: "text",
          info: `Field name to get distinct values in ${collectionName}`
        })),
        validFor: /^\w*$/
      };
    } else if (showArgs.label === "sort") {
      return {
        from: beforeCursor.to,
        options: fields[collectionName].map(f => ({
          label: `${f}`,
          apply: `{ "${f}" : -1 })`,
          type: "json",
          info: "Sort descending. (Change to 1 for ascending)"
        })),
        validFor: /^\w*$/
      };
    } else if (showArgs.label === "limit") {
      return {
        from: beforeCursor.to,
        options: [
          {
            label: "1",
            apply: "1)",
            type: "number",
            info: "Limit results 1 documents. Min allowed."
          },
          {
            label: "30",
            apply: "30)",
            type: "number",
            info: "Limit to 30 documents. Max allowed."
          },
        ],
        validFor: /^\w*$/
      };
    }
  }

  const showExpressions = wordBefore === "$"
  if (showExpressions) {
    console.log("Suggesting expressions...");
    return {
      from: beforeCursor.from,
      options: expressions,
      validFor: /^\w*$/
    };
  }

  const showFieldNames = wordBefore.match(/,\s*\{\s*"$|,\s*"$/);
  if (showFieldNames) {
    console.log("Suggesting field names...");
    return {
      from: beforeCursor.to,
      options: fields[collectionName].map(f => ({
        label: `${f}`,
        type: "variable",
        info: `Field name or expression in ${collectionName}`
      })),
      validFor: /^\w*$/
    };
  }
  return null;
}

// Initialize CodeMirror
let view = new EditorView({
  doc: "",
  extensions: [
    basicSetup,
    autocompletion({
      override: [mongoCompletions],
      activateOnTyping: true,  // Ensures completions trigger automatically
      activateOnCompletion: () => true,  // Ensures completions trigger after selecting an option
      autoTrigger: "always"    // Forces automatic triggering as the user types
    }),
    javascript()
  ],
  parent: document.body
});
