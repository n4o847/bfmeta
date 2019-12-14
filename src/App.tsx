import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
const {
  faFastBackward,
  // faStepBackward,
  // faPlay,
  // faPause,
  faStepForward,
  faFastForward,
} = require('@fortawesome/free-solid-svg-icons');

import { BFmeta, BFmetaOptions } from './bfmeta';

const App = () => {
  const [code, setCode] = useState('');
  const [instance, setInstance] = useState<BFmeta | null>(null);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<BFmetaOptions>({
    useEscape: true,
    limit: 1000000,
    eof: 0,
  });

  const [frame, setFrame] = useState(0);
  const forceUpdate = () => {
    setFrame(frame => frame + 1);
  };

  const progPosRef = useRef<HTMLLIElement | null>(null);
  const dataPosRef = useRef<HTMLLIElement | null>(null);

  useLayoutEffect(() => {
    if (progPosRef.current) {
      progPosRef.current.scrollIntoView({ block: 'center', inline: 'center' });
    }
    if (dataPosRef.current) {
      dataPosRef.current.scrollIntoView({ block: 'center', inline: 'center' });
    }
  });

  const step = () => {
    if (!instance) {
      const instance = new BFmeta(code, options);
      instance.input.appendString(input);
      if (!instance.done) {
        instance.step();
      }
      setInstance(instance);
      forceUpdate();
    } else {
      if (!instance.done) {
        instance.step();
        forceUpdate();
      }
    }
  };

  const run = () => {
    if (!instance) {
      const instance = new BFmeta(code, options);
      instance.input.appendString(input);
      while (!instance.done) {
        instance.step();
      }
      setInstance(instance);
      forceUpdate();
    } else {
      while (!instance.done) {
        instance.step();
      }
      forceUpdate();
    }
  };

  const reset = () => {
    setInstance(null);
    forceUpdate();
  };

  const handleFastBackward = () => {
    reset();
  };

  // const handleStepBackward = () => {
  // };

  // const handlePlay = () => {
  // };

  // const handlePause = () => {
  // };

  const handleStepForward = () => {
    step();
  };

  const handleFastForward = () => {
    run();
  };

  return (
    <>
      <nav className="navbar navbar-dark bg-dark">
        <a className="navbar-brand" href="./">BFmeta Interpreter</a>
      </nav>
      <div className="container p-3">
        <div className="form-group">
          <div className="card">
            <div className="card-header">
              <form className="form-inline">
                <label>
                  <input className="form-check-input" type="checkbox"
                    value=""
                    checked={options.useEscape}
                    onChange={(e) => {
                      const value = !!e.currentTarget.checked;
                      setOptions(options => ({ ...options, useEscape: value }))
                    }}
                    disabled={!!instance}
                  />
                  <span>Enable Escape Sequence (<code>\\</code>, <code>\0</code>, <code>\xhh</code>)</span>
                </label>
                <label className="my-1 ml-4 mr-2">Execution Limit</label>
                <input type="number" className="form-control"
                  value={options.limit}
                  onChange={(e) => {
                    const value = parseInt(e.currentTarget.value, 10);
                    if (value >= 0) {
                      setOptions(options => ({ ...options, limit: value }));
                    }
                  }}
                  disabled={!!instance}
                />
                <label className="my-1 ml-4 mr-2">EOF</label>
                <div className="form-check form-check-inline">
                  <label>
                    <input className="form-check-input" type="checkbox"
                      checked={options.eof === 0}
                      onChange={() => setOptions(options => ({ ...options, eof: 0 }))}
                      disabled={!!instance}
                    />
                    <span>0</span>
                  </label>
                </div>
                <div className="form-check form-check-inline">
                  <label>
                    <input className="form-check-input" type="checkbox"
                      checked={options.eof === 255}
                      onChange={() => setOptions(options => ({ ...options, eof: 255 }))}
                      disabled={!!instance}
                    />
                    <span>255</span>
                  </label>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Code</label>
          <textarea
            className="form-control text-monospace"
            rows={8}
            spellCheck={false}
            defaultValue={code}
            onInput={(e) => setCode(e.currentTarget.value)}
            disabled={!!instance}
            placeholder="[>]<<<<<<<<<<<<[.>]Hello World!"
          ></textarea>
        </div>
        <div className="form-group">
          <label>Input</label>
          <textarea
            className="form-control text-monospace"
            rows={4}
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            disabled={!!instance}
          ></textarea>
        </div>
        {
          instance && (
            <>
              <div className="form-group">
                <label>Program Pointer</label>
                <div className="overflow-auto">
                  <ul className="list-group list-group-horizontal">
                    {
                      instance.entries().map(([index, byte]) => (
                        <li
                          key={index}
                          className={[
                            'list-group-item',
                            ...(index === instance.progPos ? [
                              'list-group-item-primary',
                            ] : index === instance.dataPos ? [
                              'list-group-item-danger',
                            ] : []),
                            'text-center',
                          ].join(' ')}
                          ref={index === instance.progPos ? progPosRef : null}
                        >
                          <pre className="text-monospace m-0">{String.fromCodePoint(byte)}</pre>
                          <div className="text-monospace">{byte}</div>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              </div>
              <div className="form-group">
                <label>Data Pointer</label>
                <div className="overflow-auto">
                  <ul className="list-group list-group-horizontal">
                    {
                      instance.entries().map(([index, byte]) => (
                        <li
                          key={index}
                          className={[
                            'list-group-item',
                            ...(index === instance.dataPos ? [
                              'list-group-item-danger',
                            ] : index === instance.progPos ? [
                              'list-group-item-primary',
                            ] : []),
                            'text-center',
                          ].join(' ')}
                          ref={index === instance.dataPos ? dataPosRef : null}
                        >
                          <pre className="text-monospace m-0">{String.fromCodePoint(byte)}</pre>
                          <div className="text-monospace">{byte}</div>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              </div>
            </>
          )
        }
        <div className="form-group text-center">
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleFastBackward}
              disabled={!instance}
              title="Fast Backward"
            >
              <FontAwesomeIcon icon={faFastBackward} fixedWidth />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStepForward}
              disabled={!!instance && instance.done}
              title="Step Forward"
            >
              <FontAwesomeIcon icon={faStepForward} fixedWidth />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleFastForward}
              disabled={!!instance && instance.done}
              title="Fast Forward"
            >
              <FontAwesomeIcon icon={faFastForward} fixedWidth />
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Output</label>
          <textarea
            className="form-control text-monospace"
            rows={4}
            spellCheck={false}
            value={instance ? instance.output.toString() : ''}
            readOnly
          ></textarea>
        </div>
        <div className="form-group">
          <label>Error</label>
          <textarea
            className="form-control text-monospace"
            rows={4}
            spellCheck={false}
            value={instance ? instance.error.toString() : ''}
            readOnly
          ></textarea>
        </div>
      </div>
      <div className="text-center">
        <p>
          <a href="https://www.kmc.gr.jp/~prime/bfmeta/" target="_blank" rel="noopener">Official Site</a>
        </p>
      </div>
    </>
  );
};

export default App;
