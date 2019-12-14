class Stream {
  buffer: number[];

  constructor() {
    this.buffer = [];
  }

  appendBytes(data: number[]) {
    this.buffer.push(...data.map((n) => n & 0xff));
  }

  appendString(data: string) {
    this.buffer.push(...new TextEncoder().encode(data));
  }

  toString() {
    return new TextDecoder().decode(Uint8Array.from(this.buffer));
  }

  shift() {
    return this.buffer.shift();
  }

  push(...items: number[]) {
    return this.buffer.push(...items);
  }
}

enum Command {
  Fwd = '>'.codePointAt(0) as number,
  Bwd = '<'.codePointAt(0) as number,
  Inc = '+'.codePointAt(0) as number,
  Dec = '-'.codePointAt(0) as number,
  Opn = '['.codePointAt(0) as number,
  Cls = ']'.codePointAt(0) as number,
  Get = ','.codePointAt(0) as number,
  Put = '.'.codePointAt(0) as number,
  End = '\0'.codePointAt(0) as number,
}

export interface BFmetaOptions {
  useEscape: boolean;
  limit: number;
  eof: number;
}

export class BFmeta {
  static escape(code: string) {
    const buffer = [];
    const bytes = new TextEncoder().encode(code);
    for (let i = 0; i < bytes.length; i++) {
      switch (String.fromCodePoint(bytes[i])) {
        case '\\':
          i++;
          switch (String.fromCodePoint(bytes[i])) {
            case '0':
              buffer.push(0);
              break;
            case 'x': case 'X':
              i++;
              const a = String.fromCodePoint(...bytes.slice(i, i + 2));
              if (/^[0-9A-Fa-f]{2}$/.test(a)) {
                i++;
                buffer.push(parseInt(a, 16));
              } else {
                throw new Error(`Undefined escape sequence\n`);
              }
              break;
            default:
              throw new Error(`Undefined escape sequence\n`);
          }
          break;
        default:
          buffer.push(bytes[i]);
          break;
      }
    }
    return buffer;
  }

  code: string;
  progPos: number;
  dataPos: number;
  buffer: { [index: number]: number };
  input: Stream;
  output: Stream;
  error: Stream;
  count: number;
  minPos: number;
  maxPos: number;
  done: boolean;
  options: BFmetaOptions;

  constructor(code: string, {
    useEscape = true,
    limit = 1000000,
    eof = 0,
  }: Partial<BFmetaOptions> = {}) {
    this.code = code;
    this.progPos = -1;
    this.dataPos = 0;
    this.buffer = {};
    this.input = new Stream();
    this.output = new Stream();
    this.error = new Stream();
    this.count = 0;
    this.minPos = 0;
    this.maxPos = 0;
    this.done = false;
    this.options = {
      useEscape,
      limit,
      eof,
    };

    if (useEscape) {
      try {
        const buffer = BFmeta.escape(code);
        for (let i = 0; i < buffer.length; i++) {
          this.buffer[i] = buffer[i];
        }
        this.maxPos = buffer.length - 1;
      } catch (e) {
        this.error.appendString(e.toString());
      }
    } else {
      const buffer = new TextEncoder().encode(code);
      for (let i = 0; i < buffer.length; i++) {
        this.buffer[i] = buffer[i];
        this.maxPos = buffer.length - 1;
      }
    }
  }

  step() {
    if (this.done) {
      return;
    }
    this.count++;
    if (this.count > this.options.limit) {
      this.error.appendString(`Limit exceeded\n`);
      this.done = true;
      return;
    }
    // Go to next command
    while (true) {
      this.progPos++;
      if (this.progPos > this.maxPos) {
        this.maxPos = this.progPos;
        this.buffer[this.progPos] &= 0xff;
      }
      if (this.buffer[this.progPos] in Command) {
        break;
      }
    }
    // Execute
    switch (this.buffer[this.progPos]) {
      case Command.Fwd:
        this.dataPos++;
        break;
      case Command.Bwd:
        this.dataPos--;
        break;
      case Command.Inc:
        this.buffer[this.dataPos]++;
        break;
      case Command.Dec:
        this.buffer[this.dataPos]--;
        break;
      case Command.Opn:
        if (this.buffer[this.dataPos] === 0) {
          let count = 1;
          while (count !== 0) {
            this.progPos++;
            if (this.progPos > this.maxPos) {
              this.error.appendString(`Unmatched bracket [\n`);
              this.done = true;
              return;
            }
            switch (this.buffer[this.progPos]) {
              case Command.Opn:
                count++;
                break;
              case Command.Cls:
                count--;
                break;
            }
          }
        }
        break;
      case Command.Cls:
        if (this.buffer[this.dataPos] !== 0) {
          let count = -1;
          while (count !== 0) {
            this.progPos--;
            if (this.progPos < this.minPos) {
              this.error.appendString(`Unmatched bracket ]\n`);
              this.done = true;
              return;
            }
            switch (this.buffer[this.progPos]) {
              case Command.Opn:
                count++;
                break;
              case Command.Cls:
                count--;
                break;
            }
          }
        }
        break;
      case Command.Get:
        const byte = this.input.shift();
        if (byte === undefined) {
          this.buffer[this.dataPos] = this.options.eof;
        } else {
          this.buffer[this.dataPos] = byte;
        }
        break;
      case Command.Put:
        this.output.push(this.buffer[this.dataPos]);
        break;
      case Command.End:
        this.done = true;
        return;
    }
    this.buffer[this.dataPos] &= 0xff;
    this.minPos = Math.min(this.minPos, this.dataPos);
    this.maxPos = Math.max(this.maxPos, this.dataPos);
  }

  entries(): [number, number][] {
    const result = [];
    for (let i = this.minPos; i <= this.maxPos; i++) {
      result.push([i, this.buffer[i] & 0xff] as [number, number]);
    }
    return result;
  }
}
