#!/usr/bin/env python3
"""Recover Python source from .pyc bytecode files for Python 3.12+."""

import marshal
import dis
import struct
import sys
import os
from types import CodeType

def load_code_from_pyc(filepath):
    """Load code object from a .pyc file (Python 3.12+)."""
    with open(filepath, 'rb') as f:
        magic = f.read(4)
        flags = struct.unpack('<I', f.read(4))[0]
        # Skip hash/timestamp (4 or 8 bytes depending on flags)
        if flags & 0x1:
            f.read(4)  # source size
        else:
            f.read(8)  # hash
        code = marshal.load(f)
    return code

def extract_code_info(code, indent=0, prefix=""):
    """Extract high-level information from a code object."""
    info = {}
    info['name'] = code.co_name
    info['filename'] = code.co_filename
    info['varnames'] = code.co_varnames
    info['names'] = code.co_names
    info['consts'] = []
    info['nlocals'] = code.co_nlocals
    info['argcount'] = code.co_argcount + code.co_kwonlyargcount
    info['type'] = 'module' if code.co_name == '<module>' else 'function'
    
    for const in code.co_consts:
        if isinstance(const, CodeType):
            info['consts'].append(('code', extract_code_info(const)))
        elif isinstance(const, str):
            info['consts'].append(('str', const))
        else:
            info['consts'].append(('literal', repr(const)))
    
    return info

def pretty_print_info(info, indent=0):
    """Pretty print the extracted code info."""
    prefix = '  ' * indent
    if info['type'] == 'module':
        print(f"{prefix}Module: {info['filename']}")
    else:
        args = ', '.join(info['varnames'][:info['argcount']]) if info['argcount'] > 0 else ''
        print(f"{prefix}Function: {info['name']}({args})")
    
    if info['varnames']:
        print(f"{prefix}  Locals: {', '.join(info['varnames'])}")
    if info['names']:
        print(f"{prefix}  Globals: {', '.join(info['names'])}")
    
    for const_type, const_val in info['consts']:
        if const_type == 'code':
            pretty_print_info(const_val, indent + 1)
        elif const_type == 'str' and const_val.strip():
            docstring = const_val.strip()[:100]
            print(f"{prefix}  Docstring: {docstring}")

def reconstruct_source(info, indent=0):
    """Attempt to reconstruct Python source from code info."""
    lines = []
    prefix = '    ' * indent
    
    if info['type'] == 'module':
        for name in info['names']:
            if name.startswith('__') and name.endswith('__'):
                continue
        for const_type, const_val in info['consts']:
            if const_type == 'code':
                src = reconstruct_source(const_val, indent)
                if src:
                    lines.append(src)
            elif const_type == 'str' and const_val.strip():
                pass  # Skip docstrings for this reconstruction
    else:
        args_list = []
        for i in range(info['argcount']):
            if i < len(info['varnames']):
                args_list.append(info['varnames'][i])
        args_str = ', '.join(args_list)
        
        lines.append(f"{prefix}def {info['name']}({args_str}):")
        
        first_const = True
        for const_type, const_val in info['consts']:
            if const_type == 'code':
                src = reconstruct_source(const_val, indent + 1)
                if src:
                    lines.append(src)
            elif const_type == 'str' and first_const:
                lines.append(f"{prefix}    \"\"\"{const_val.strip()[:80]}\"\"\"")
                first_const = False
    
    return '\n'.join(lines)

def disassemble_pyc(filepath):
    """Disassemble a .pyc file and print its bytecode."""
    code = load_code_from_pyc(filepath)
    print(f"\n{'='*80}")
    print(f"File: {filepath}")
    print(f"Module: {code.co_filename}")
    print(f"{'='*80}")
    info = extract_code_info(code)
    pretty_print_info(info)
    print()
    print("Bytecode:")
    dis.dis(code)

def main():
    base_dir = os.path.join(os.path.dirname(__file__), 'app')
    pyc_files = []
    
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith('.pyc') and not f.startswith('.'):
                pyc_files.append(os.path.join(root, f))
    
    pyc_files.sort()
    
    for pyc_file in pyc_files:
        try:
            code = load_code_from_pyc(pyc_file)
            info = extract_code_info(code)
            pretty_print_info(info)
            print()
        except Exception as e:
            print(f"Error processing {pyc_file}: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()
