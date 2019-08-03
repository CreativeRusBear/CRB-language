/** Parser */
const FALSE = {type: "bool", value: false};

function Parse(input) {
    const PRECEDENCE = {
        "=": 1,
        "||": 2,
        "&&": 3,
        "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
        "+": 10, "-": 10,
        "*": 20, "/": 20, "%": 20
    };
    return parseTopLevel();

    function isPunc(char) {
        const tok = input.peek();
        return tok && tok.type === "punc" && (!char || tok.value === char) && tok;
    }

    function isKw(char) {
        const tok = input.peek();
        return tok && tok.type === "kw" && (!char || tok.value === char) && tok;
    }

    function isOp(char) {
        const tok = input.peek();
        return tok && tok.type === "op" && (!char || tok.value === char) && tok;
    }

    function skipPunc(char) {
        (isPunc(char)) ? input.next() : input.croak(`Expecting punctuation: ${char}`);
    }

    function skipKw(char) {
        (isKw(char)) ? input.next() : input.croak(`Expecting keyword: ${char}`);
    }

    function skipOp(char) {
        (isOp(char)) ? input.next() : input.croak(`Expecting operator: ${char}`);
    }

    function unexpected() {
        input.croak(`Unexpected token: ${JSON.stringify(input.peek())}`);
    }

    function parseCRB() {
        return {
            type: "CRB",
            vars: delimited("(", ")", ",", parseVarname),
            body: parseExp()
        };
    }

    function delimited(start, stop, separator, parser) {
        let a = [];
        let first = true;
        skipPunc(start);
        while (!input.eof()) {
            if (isPunc(stop)) break; // последний разделитель может быть пропущен
            (first) ? first = false : skipPunc(separator);
            if (isPunc(stop)) break;
            a.push(parser());
        }
        skipPunc(stop);
        return a;
    }

    function parseTopLevel() {
        let prog = [];
        while (!input.eof()) {
            prog.push(parseExp());
            if (!input.eof()) skipPunc(";");
        }
        return {type: "prog", prog: prog}
    }

    function parseIf() {
        skipKw("if");
        let cond = parseExp();
        if (!isPunc("{")) skipKw("then");
        let then = parseExp();
        let ret = {type: "if", cond: cond, then: then};
        if (isKw("else")) {
            input.next();
            ret.else = parseExp();
        }
        return ret;
    }

    function parseAtom() {
        return maybeCall(() => {

            if (isPunc("(")) {
                input.next();
                const exp = parseExp();
                skipPunc(")");
                return exp;
            }

            if (isPunc("{")) return parseProg();
            if (isKw("if")) return parseIf();
            if (isKw("true") || isKw("false")) return parseBool();
            if (isKw("CRB") || isKw("CreativeRusBear")) {
                input.next();
                return parseCRB();
            }
            const types = ["var", "num", "str"];
            const tok = input.next();
            if (types.includes(tok)) {
                return tok;
            }
            unexpected();
        });
    }


    function parseProg() {
        const prog = delimited("{", "}", ";", parseExp);
        if (prog.length == 0) return FALSE;
        if (prog.length == 1) return prog[0];
        return {type: "prog", prog: prog};
    }

    function parseExp() {
        return maybeCall(() => maybeBin(parseAtom(), 0));
    }

    function maybeCall(exp) {
        exp = exp();
        return isPunc("(") ? parseCall(exp) : exp;
    }

    function parseCall(func) {
        return {
            type: "call",
            func: func,
            args: delimited("(", ")", ",", parseExp)
        };
    }

    function maybeBin(left, myPrec) {
        const tok = isOp();
        if (tok) {
            const hisPrec = PRECEDENCE[tok.value];
            if (hisPrec > myPrec) {
                input.next();
                return maybeBin({
                    type: tok.value === "=" ? "assign" : "binary",
                    operator: tok.value,
                    left: left,
                    right: right
                }, myPrec);
            }
        }
        return left;
    }

    function parseVarname() {
        const name = input.next();
        if (name.type !== "var") input.croak("Expecting variable name");
        return name.value;
    }

    function parseBool() {
        return {type: "bool", value: input.next().value === "true"};
    }
}

module.exports = Parse;